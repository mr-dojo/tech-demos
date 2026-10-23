import { isLocalOnlyRequest } from "@/lib/local-request"
import { runPinnedProver } from "@/lib/run-prover"

export function POST(request: Request) {
  if (!isLocalOnlyRequest(request)) {
    return Response.json(
      { error: "This endpoint listens for localhost only. Add auth and rate limiting before hosting it." },
      { status: 403 },
    )
  }
  return Response.json(runPinnedProver())
}
