/**
 * Supabase database types.
 *
 * After the first migration is deployed, regenerate this file with:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> --schema public > src/types/database.ts
 *
 * The skeleton below mirrors the schema in supabase/migrations and is enough
 * to type the clients until the first generation is run.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FriendshipStatus = "pending" | "accepted" | "blocked";
export type GameStatus = "scheduled" | "in_progress" | "finished" | "cancelled";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
        };
        Update: {
          status?: FriendshipStatus;
        };
        Relationships: [
          {
            foreignKeyName: "friendships_requester_id_fkey";
            columns: ["requester_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey";
            columns: ["addressee_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          city: string | null;
          region: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          description: string | null;
          hole_count: number;
          total_par: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          city?: string | null;
          region?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          description?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          city?: string | null;
          region?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          description?: string | null;
        };
        Relationships: [];
      };
      holes: {
        Row: {
          id: string;
          course_id: string;
          number: number;
          par: number;
          distance_m: number | null;
          notes: string | null;
        };
        Insert: {
          course_id: string;
          number: number;
          par: number;
          distance_m?: number | null;
          notes?: string | null;
        };
        Update: {
          number?: number;
          par?: number;
          distance_m?: number | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "holes_course_id_fkey";
            columns: ["course_id"];
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          id: string;
          course_id: string;
          host_id: string;
          name: string | null;
          notes: string | null;
          status: GameStatus;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          host_id: string;
          name?: string | null;
          notes?: string | null;
          status?: GameStatus;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Update: {
          name?: string | null;
          notes?: string | null;
          status?: GameStatus;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "games_course_id_fkey";
            columns: ["course_id"];
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "games_host_id_fkey";
            columns: ["host_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      game_players: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;
          display_name: string | null;
          position: number;
          joined_at: string;
        };
        Insert: {
          game_id: string;
          user_id: string;
          display_name?: string | null;
          position?: number;
        };
        Update: {
          display_name?: string | null;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey";
            columns: ["game_id"];
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_players_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          id: string;
          game_id: string;
          game_player_id: string;
          hole_id: string;
          strokes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          game_id: string;
          game_player_id: string;
          hole_id: string;
          strokes: number;
        };
        Update: {
          strokes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "scores_game_id_fkey";
            columns: ["game_id"];
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scores_game_player_id_fkey";
            columns: ["game_player_id"];
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scores_hole_id_fkey";
            columns: ["hole_id"];
            referencedRelation: "holes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      game_leaderboard: {
        Row: {
          game_id: string | null;
          game_player_id: string | null;
          user_id: string | null;
          display_name: string | null;
          full_name: string | null;
          avatar_url: string | null;
          total_strokes: number | null;
          holes_played: number | null;
          relative_to_par: number | null;
        };
        Relationships: [];
      };
      public_users: {
        Row: {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      are_friends: {
        Args: { a: string; b: string };
        Returns: boolean;
      };
      is_game_participant: {
        Args: { p_game_id: string; p_user_id: string };
        Returns: boolean;
      };
      get_game_invite_info: {
        Args: { p_game_id: string };
        Returns: {
          game_id: string;
          name: string | null;
          status: GameStatus;
          host_full_name: string | null;
          host_username: string | null;
          course_name: string | null;
          course_city: string | null;
        }[];
      };
      join_game: {
        Args: { p_game_id: string };
        Returns: void;
      };
      create_game: {
        Args: { p_course_id: string; p_name?: string | null; p_player_ids?: string[] };
        Returns: string;
      };
      get_course_leaderboard: {
        Args: { p_course_id: string; p_limit?: number };
        Returns: {
          user_id: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
          rounds: number;
          best_relative: number;
          avg_relative: number;
        }[];
      };
      delete_my_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      ensure_user_profile: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["users"]["Row"];
      };
    };
    Enums: {
      friendship_status: FriendshipStatus;
      game_status: GameStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
