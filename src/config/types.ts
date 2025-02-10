import { Context } from 'telegraf';

export interface SessionData {
  state: string;
  msgId?: number | undefined;
  mint: string | undefined;
}

export interface MyContext extends Context {
  ctx: {};
  session: SessionData;
}

export interface TokenInfoType {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  risk: number;
  poolAddress?: string;
}

export interface Tweet {
  id: string;
  type: string;
  subtweet: null;
  created_at: number;
  author: Author;
  reply: null;
  quoted: null;
  poll: null;
  card: null;
  article: null;
  grok: null;
  body: Body;
  media: Media;
  metrics: Metrics;
}

export interface TweetProfile {
  id: string;
  handle: string;
}

export interface Author {
  id: string;
  handle: string;
  verified: boolean;
  private: boolean;
  sensitive: boolean;
  restricted: boolean;
  joined_at: number;
  profile: Profile;
  metrics: AuthorMetrics;
}

export interface Profile {
  name: string;
  pinned: any[];
  location: null;
  avatar: string;
  banner: null;
  url: null;
  description: Description;
}

export interface Description {
  text: string;
  urls: any[];
}

export interface AuthorMetrics {
  likes: number;
  media: number;
  friends: number;
  tweets: number;
  following: number;
  followers: number;
}

export interface Body {
  text: string;
  urls: any[];
  mentions: any[];
  components: any[];
}

export interface Media {
  images: any[];
  videos: any[];
  thumbnails: any[];
  proxied: ProxiedMedia;
}

export interface ProxiedMedia {
  images: any[];
  thumbnails: any[];
}

export interface Metrics {
  likes: number;
  quotes: number;
  replies: number;
  retweets: number;
}
