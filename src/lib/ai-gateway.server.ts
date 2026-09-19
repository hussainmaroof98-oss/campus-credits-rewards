const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function getLovableAiGatewayRunId(request: Request) {
  return request.headers.get(RUN_ID_HEADER)?.trim() || undefined;
}

export function gatewayHeaders(apiKey: string, runId?: string) {
  return {
    "Content-Type": "application/json",
    "Lovable-API-Key": apiKey,
    "X-Lovable-AIG-SDK": "fetch",
    ...(runId ? { [RUN_ID_HEADER]: runId } : {}),
  };
}

export function exposedRunIdHeaders(response: Response, fallbackRunId?: string) {
  const runId = response.headers.get(RUN_ID_HEADER) ?? fallbackRunId;
  return {
    "Content-Type": response.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    ...(runId
      ? {
          [RUN_ID_HEADER]: runId,
          "Access-Control-Expose-Headers": RUN_ID_HEADER,
        }
      : {}),
  };
}
