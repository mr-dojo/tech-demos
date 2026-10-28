import { FEED } from "@/data/trace"
import { GPUS } from "@/data/gpus"
import { isLocalOnlyRequest } from "@/lib/local-request"
import { readPolicies, recordedReports } from "@/lib/recordings"

export function GET(request: Request) {
  if (!isLocalOnlyRequest(request)) {
    return Response.json(
      { error: "This endpoint listens for localhost only. Add auth and rate limiting before hosting it." },
      { status: 403 },
    )
  }

  return Response.json({
    provenance: {
      prover: "recorded",
      proverVersion: "0.1.5",
      sandbox: "not-run",
      eventStream: "sample",
      note: "Policy JSON is verbatim openshell-prover 0.1.5 stdout. The activity cards are sample data. No sandbox was running.",
    },
    policies: readPolicies(),
    reports: recordedReports(),
    events: FEED,
    gpus: GPUS,
  })
}
