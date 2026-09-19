declare global {
	namespace NodeJS {
		interface ProcessEnv {
			EXPO_PUBLIC_DATA_MODE?: "local" | "remote";
			EXPO_PUBLIC_API_URL?: string;
			EXPO_PUBLIC_API_VERSION?: string;
			EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
			EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
			EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
		}
	}
}

export {};
