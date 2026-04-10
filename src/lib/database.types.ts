export type PlaylistStatus = "pending" | "processing" | "completed";
export type VideoStatus =
  | "queued"
  | "processing"
  | "success"
  | "no_transcript"
  | "error";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          is_supporter: boolean;
        };
        Insert: {
          id: string;
          email: string;
          is_supporter?: boolean;
        };
        Update: {
          email?: string;
          is_supporter?: boolean;
        };
        Relationships: [];
      };
      playlists: {
        Row: {
          id: string;
          user_id: string | null;
          url: string;
          title: string;
          channel_name: string | null;
          status: PlaylistStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          url: string;
          title: string;
          channel_name?: string | null;
          status?: PlaylistStatus;
          created_at?: string;
        };
        Update: {
          title?: string;
          channel_name?: string | null;
          status?: PlaylistStatus;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          id: string;
          playlist_id: string;
          yt_video_id: string;
          title: string;
          transcript: string | null;
          status: VideoStatus;
          retry_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          playlist_id: string;
          yt_video_id: string;
          title: string;
          transcript?: string | null;
          status?: VideoStatus;
          retry_count?: number;
          created_at?: string;
        };
        Update: {
          transcript?: string | null;
          status?: VideoStatus;
          retry_count?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      playlist_status: PlaylistStatus;
      video_status: VideoStatus;
    };
  };
};
