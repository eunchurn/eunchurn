declare namespace NodeJS {
  export interface ProcessEnv extends NodeJS.ProcessEnv {
    OPEN_WEATHER_MAP_KEY: string;
    WAKATIME_API_KEY: string;
    GH_TOKEN: string;
    SHOW_TOTAL_TIME: string;
    SHOW_PROFILE: string;
    SHORT_INFO: string;
    SHOW_WAKASTAT: string;
    SHOW_COMMIT: string;
    SHOW_WEEK: string;
    SHOW_LANGUAGE: string;
    SHOW_EDITORS: string;
    SHOW_OS: string;
    SHOW_PROJECTS: string;
    SHOW_LANGUAGE_PER_REPO: string;
    SHOW_UPDATE_DATE: string;
    INPUT_COMMIT_MESSAGE: string;
    IG_USER: string;
    IG_PASSWORD: string;
  }
}
