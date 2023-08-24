export const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const containsStories = (text: string): boolean => {
    // Regular expression to check if the string contains the word "stories"
    const storiesRegex = /\bstories\b/i;
    return storiesRegex.test(text);
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
