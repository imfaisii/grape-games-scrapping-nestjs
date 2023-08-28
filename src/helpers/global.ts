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

export const getStringsBetween = (
  string: string,
  start: string,
  end: string,
): string[] => {
  const extractedStrings = [];
  let startIndex = 0;

  while (true) {
    const currentStartIndex = string.indexOf(start, startIndex);
    if (currentStartIndex === -1) {
      break; // No more start substrings found
    }

    const currentEndIndex = string.indexOf(
      end,
      currentStartIndex + start.length,
    );
    if (currentEndIndex === -1) {
      break; // End substring not found after current start substring
    }

    const extractedString = string.substring(
      currentStartIndex + start.length,
      currentEndIndex,
    );

    extractedStrings.push(extractedString);

    // Move the startIndex to start searching after the current end index
    startIndex = currentEndIndex + end.length;
  }

  return extractedStrings;
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
