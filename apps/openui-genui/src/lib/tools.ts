import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

/** Example app-owned tool: current weather via Open-Meteo (free, no API key). */

export const WEATHER_TOOL_DESCRIPTION =
  "Get the current weather for a city or place name. Use whenever the user " +
  "asks about weather, temperature, rain, or what to wear.";

export const weatherInputSchema = z.object({
  location: z
    .string()
    .trim()
    .min(1, "location is required")
    .describe("City or place name, e.g. Berlin."),
});

export type WeatherResult =
  | {
      place: string;
      temperature_c: number;
      conditions: string;
      wind_kmh: number;
    }
  | { error: string };

function describeWeather(code: number): string {
  if (code === 0) return "clear sky";
  if (code <= 3) return "partly cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain showers";
  if (code <= 86) return "snow showers";
  return "thunderstorm";
}

async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getWeather(
  locationInput: string,
  options: { signal?: AbortSignal } = {},
): Promise<WeatherResult> {
  const parsed = weatherInputSchema.safeParse({ location: locationInput });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "location is required" };
  }
  const location = parsed.data.location;

  try {
    const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoUrl.searchParams.set("name", location);
    geoUrl.searchParams.set("count", "1");
    const geo = await fetchJson<{
      results?: Array<{ name: string; country?: string; latitude: number; longitude: number }>;
    }>(geoUrl, options.signal);
    const place = geo.results?.[0];
    if (!place) return { error: `No place found for "${location}"` };

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(place.latitude));
    weatherUrl.searchParams.set("longitude", String(place.longitude));
    weatherUrl.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
    const weather = await fetchJson<{
      current?: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
    }>(weatherUrl, options.signal);
    if (!weather.current) return { error: "No weather data returned" };

    return {
      place: `${place.name}${place.country ? `, ${place.country}` : ""}`,
      temperature_c: weather.current.temperature_2m,
      conditions: describeWeather(weather.current.weather_code),
      wind_kmh: weather.current.wind_speed_10m,
    };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return {
      error: `Weather lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function executeGetWeather(input: unknown, signal?: AbortSignal): Promise<string> {
  const parsed = weatherInputSchema.safeParse(input);
  if (!parsed.success) {
    return JSON.stringify({ error: parsed.error.issues[0]?.message ?? "location is required" });
  }
  return JSON.stringify(await getWeather(parsed.data.location, { signal }));
}

export function weatherTool(): ChatCompletionTool {
  const parameters = z.toJSONSchema(weatherInputSchema) as Record<string, unknown>;
  delete parameters.$schema;
  return {
    type: "function",
    function: {
      name: "get_weather",
      description: WEATHER_TOOL_DESCRIPTION,
      parameters,
    },
  };
}

export async function executeTool(name: string, args: unknown, signal: AbortSignal): Promise<string> {
  if (name === "get_weather") return executeGetWeather(args, signal);
  return JSON.stringify({ error: `Unknown tool: ${name}` });
}
