export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tickers: {
        Row: {
          id: string
          symbol: string
          company_name: string | null
          sector: string | null
          industry: string | null
          market_cap: number | null
          avg_daily_mentions: number
          mention_spike_threshold: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          company_name?: string | null
          sector?: string | null
          industry?: string | null
          market_cap?: number | null
          avg_daily_mentions?: number
          mention_spike_threshold?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          company_name?: string | null
          sector?: string | null
          industry?: string | null
          market_cap?: number | null
          avg_daily_mentions?: number
          mention_spike_threshold?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          id: string
          name: string
          platform: string
          username: string | null
          source_type: string
          follower_count: number
          credibility_score: number
          total_predictions: number
          correct_predictions: number
          accuracy_rate: number
          avg_days_to_target: number | null
          uses_data_sources: boolean
          reasoning_quality: number
          transparency_score: number
          bio: string | null
          url: string | null
          verified: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          platform: string
          username?: string | null
          source_type: string
          follower_count?: number
          credibility_score?: number
          total_predictions?: number
          correct_predictions?: number
          accuracy_rate?: number
          avg_days_to_target?: number | null
          uses_data_sources?: boolean
          reasoning_quality?: number
          transparency_score?: number
          bio?: string | null
          url?: string | null
          verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          platform?: string
          username?: string | null
          source_type?: string
          follower_count?: number
          credibility_score?: number
          total_predictions?: number
          correct_predictions?: number
          accuracy_rate?: number
          avg_days_to_target?: number | null
          uses_data_sources?: boolean
          reasoning_quality?: number
          transparency_score?: number
          bio?: string | null
          url?: string | null
          verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          id: string
          ticker_id: string
          source_id: string | null
          content: string
          url: string | null
          platform: string
          mentioned_at: string
          detected_at: string
          engagement_score: number
          is_prediction: boolean
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ticker_id: string
          source_id?: string | null
          content: string
          url?: string | null
          platform: string
          mentioned_at: string
          detected_at?: string
          engagement_score?: number
          is_prediction?: boolean
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ticker_id?: string
          source_id?: string | null
          content?: string
          url?: string | null
          platform?: string
          mentioned_at?: string
          detected_at?: string
          engagement_score?: number
          is_prediction?: boolean
          processed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: string
          ticker_id: string
          source_id: string
          mention_id: string | null
          sentiment: 'bullish' | 'bearish' | 'neutral'
          price_target: number | null
          timeframe_days: number | null
          confidence_level: 'low' | 'medium' | 'high' | null
          reasoning: string | null
          data_sources_cited: string[] | null
          catalysts: string[] | null
          reasoning_quality_score: number | null
          data_discipline_score: number | null
          transparency_score: number | null
          prediction_date: string
          target_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticker_id: string
          source_id: string
          mention_id?: string | null
          sentiment: 'bullish' | 'bearish' | 'neutral'
          price_target?: number | null
          timeframe_days?: number | null
          confidence_level?: 'low' | 'medium' | 'high' | null
          reasoning?: string | null
          data_sources_cited?: string[] | null
          catalysts?: string[] | null
          reasoning_quality_score?: number | null
          data_discipline_score?: number | null
          transparency_score?: number | null
          prediction_date: string
          target_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticker_id?: string
          source_id?: string
          mention_id?: string | null
          sentiment?: 'bullish' | 'bearish' | 'neutral'
          price_target?: number | null
          timeframe_days?: number | null
          confidence_level?: 'low' | 'medium' | 'high' | null
          reasoning?: string | null
          data_sources_cited?: string[] | null
          catalysts?: string[] | null
          reasoning_quality_score?: number | null
          data_discipline_score?: number | null
          transparency_score?: number | null
          prediction_date?: string
          target_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      validations: {
        Row: {
          id: string
          prediction_id: string
          price_at_prediction: number
          price_at_validation: number
          price_change_percent: number
          was_correct: boolean
          accuracy_score: number
          days_to_outcome: number | null
          validation_date: string
          validation_method: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prediction_id: string
          price_at_prediction: number
          price_at_validation: number
          price_change_percent: number
          was_correct: boolean
          accuracy_score: number
          days_to_outcome?: number | null
          validation_date: string
          validation_method?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prediction_id?: string
          price_at_prediction?: number
          price_at_validation?: number
          price_change_percent?: number
          was_correct?: boolean
          accuracy_score?: number
          days_to_outcome?: number | null
          validation_date?: string
          validation_method?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      scan_log: {
        Row: {
          id: string
          scan_type: string
          status: string
          mentions_found: number
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          scan_type: string
          status: string
          mentions_found?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          scan_type?: string
          status?: string
          mentions_found?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      alert_preferences: {
        Row: {
          id: string
          user_id: string | null
          spike_alerts_enabled: boolean
          prediction_alerts_enabled: boolean
          daily_digest_enabled: boolean
          spike_mention_threshold: number
          prediction_confidence_threshold: number
          email_enabled: boolean
          email_address: string | null
          webhook_enabled: boolean
          webhook_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          spike_alerts_enabled?: boolean
          prediction_alerts_enabled?: boolean
          daily_digest_enabled?: boolean
          spike_mention_threshold?: number
          prediction_confidence_threshold?: number
          email_enabled?: boolean
          email_address?: string | null
          webhook_enabled?: boolean
          webhook_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          spike_alerts_enabled?: boolean
          prediction_alerts_enabled?: boolean
          daily_digest_enabled?: boolean
          spike_mention_threshold?: number
          prediction_confidence_threshold?: number
          email_enabled?: boolean
          email_address?: string | null
          webhook_enabled?: boolean
          webhook_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      alert_log: {
        Row: {
          id: string
          alert_type: string
          user_id: string | null
          ticker_symbol: string | null
          subject: string
          message: string
          metadata: Json | null
          status: string
          delivery_channel: string | null
          error_message: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          alert_type: string
          user_id?: string | null
          ticker_symbol?: string | null
          subject: string
          message: string
          metadata?: Json | null
          status?: string
          delivery_channel?: string | null
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          alert_type?: string
          user_id?: string | null
          ticker_symbol?: string | null
          subject?: string
          message?: string
          metadata?: Json | null
          status?: string
          delivery_channel?: string | null
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      content_drafts: {
        Row: {
          id: string
          source: string
          type: string
          title: string | null
          body: string
          status: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source: string
          type: string
          title?: string | null
          body: string
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source?: string
          type?: string
          title?: string | null
          body?: string
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_predictions: {
        Row: {
          id: string
          ticker_id: string | null
          model_type: string
          prediction_direction: string | null
          confidence_score: number | null
          predicted_magnitude: number | null
          features: Json | null
          model_version: string | null
          trained_at: string | null
          actual_direction: string | null
          actual_magnitude: number | null
          was_correct: boolean | null
          validated_at: string | null
          prediction_date: string
          target_date: string
          created_at: string
        }
        Insert: {
          id?: string
          ticker_id?: string | null
          model_type: string
          prediction_direction?: string | null
          confidence_score?: number | null
          predicted_magnitude?: number | null
          features?: Json | null
          model_version?: string | null
          trained_at?: string | null
          actual_direction?: string | null
          actual_magnitude?: number | null
          was_correct?: boolean | null
          validated_at?: string | null
          prediction_date: string
          target_date: string
          created_at?: string
        }
        Update: {
          id?: string
          ticker_id?: string | null
          model_type?: string
          prediction_direction?: string | null
          confidence_score?: number | null
          predicted_magnitude?: number | null
          features?: Json | null
          model_version?: string | null
          trained_at?: string | null
          actual_direction?: string | null
          actual_magnitude?: number | null
          was_correct?: boolean | null
          validated_at?: string | null
          prediction_date?: string
          target_date?: string
          created_at?: string
        }
        Relationships: []
      }
      model_configs: {
        Row: {
          id: string
          model_type: string
          model_version: string
          config: Json
          training_samples: number | null
          accuracy: number | null
          precision: number | null
          recall: number | null
          f1_score: number | null
          metrics_by_class: Json | null
          is_active: boolean
          trained_at: string
        }
        Insert: {
          id?: string
          model_type: string
          model_version: string
          config: Json
          training_samples?: number | null
          accuracy?: number | null
          precision?: number | null
          recall?: number | null
          f1_score?: number | null
          metrics_by_class?: Json | null
          is_active?: boolean
          trained_at?: string
        }
        Update: {
          id?: string
          model_type?: string
          model_version?: string
          config?: Json
          training_samples?: number | null
          accuracy?: number | null
          precision?: number | null
          recall?: number | null
          f1_score?: number | null
          metrics_by_class?: Json | null
          is_active?: boolean
          trained_at?: string
        }
        Relationships: []
      }
      model_training_data: {
        Row: {
          id: string
          ticker_id: string | null
          features: Json
          target_direction: string
          target_magnitude: number
          observation_date: string
          target_date: string
          created_at: string
        }
        Insert: {
          id?: string
          ticker_id?: string | null
          features: Json
          target_direction: string
          target_magnitude: number
          observation_date: string
          target_date: string
          created_at?: string
        }
        Update: {
          id?: string
          ticker_id?: string | null
          features?: Json
          target_direction?: string
          target_magnitude?: number
          observation_date?: string
          target_date?: string
          created_at?: string
        }
        Relationships: []
      }
      mention_frequency: {
        Row: {
          id: string
          ticker_id: string
          date: string
          mention_count: number
          unique_sources: number
          avg_sentiment_score: number | null
          spike_detected: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ticker_id: string
          date: string
          mention_count?: number
          unique_sources?: number
          avg_sentiment_score?: number | null
          spike_detected?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ticker_id?: string
          date?: string
          mention_count?: number
          unique_sources?: number
          avg_sentiment_score?: number | null
          spike_detected?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
