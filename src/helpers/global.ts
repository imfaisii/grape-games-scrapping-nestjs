import { start } from 'repl';

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const extractSubstring = (
  inputString: string,
  startSubstring: string,
  endSubstring: string,
): string => {
  const startIndex = inputString.indexOf(startSubstring);
  if (startIndex === -1) {
    return null; // Start substring not found
  }

  const endIndex = inputString.indexOf(
    endSubstring,
    startIndex + startSubstring.length,
  );
  if (endIndex === -1) {
    return null; // End substring not found
  }

  const extractedString = inputString.substring(
    startIndex + startSubstring.length,
    endIndex,
  );

  return extractedString;
};

export const getStringBetween = (
  string: string,
  start: string,
  end: string,
): string => {
  const startIndex = string.indexOf(start);
  if (startIndex === -1) {
    return null; // Start substring not found
  }

  const endIndex = string.indexOf(end, startIndex + start.length);
  if (endIndex === -1) {
    return null; // End substring not found
  }

  const extractedString = string.substring(startIndex + start.length, endIndex);

  return extractedString;
};

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T[];
}

export function createApiResponse<T>(
  status: boolean,
  message: string,
  data?: T[],
): ApiResponse<T> {
  return {
    status: status,
    message: message,
    data: data,
  };
}
