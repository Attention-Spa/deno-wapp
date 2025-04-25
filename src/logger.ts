type LogEntry = {
    timestamp: number;
    ip: string;
    action: string;
    outcome: unknown;
};

const MAX_LENGTH = 25000;

export function appendToLog(existingLog: string, newEntry: LogEntry): string {
    const logs: LogEntry[] = parseLog(existingLog);
    logs.push(newEntry);

    let result = JSON.stringify(logs, null, 2);
    while (result.length > MAX_LENGTH && logs.length > 1) {
        logs.shift();
        result = JSON.stringify(logs, null, 2);
    }

    return result;
}

export function parseLog(logString: string): LogEntry[] {
    try {
        return JSON.parse(logString || "[]");
    } catch {
        return [];
    }
}
