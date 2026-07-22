export interface EmojiPost {
  userId: string;
  emoji: string;
  timestamp: string;
}

export interface AuthTokenResponse {
  token: string;
  userId: string;
  expiresIn: string;
}

export interface FeedResponse {
  feed: EmojiPost[];
  total: number;
}

export interface ServiceInstance {
  address: string;
  port: number;
}

export interface ServiceRegistration {
  name: string;
  id?: string;
  host: string;
  port: number;
}

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
  uptime: number;
}
