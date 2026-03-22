export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string
          created_at: string | null
          details: Json | null
          id: number
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      ai_prompt_templates: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          max_tokens: number | null
          model: string | null
          prompt_name: string | null
          response_format: string | null
          system_prompt: string
          temperature: number | null
          template_id: string
          updated_at: string | null
          user_template: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string | null
          prompt_name?: string | null
          response_format?: string | null
          system_prompt: string
          temperature?: number | null
          template_id: string
          updated_at?: string | null
          user_template?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string | null
          prompt_name?: string | null
          response_format?: string | null
          system_prompt?: string
          temperature?: number | null
          template_id?: string
          updated_at?: string | null
          user_template?: string | null
        }
        Relationships: []
      }
      evaluation_criteria: {
        Row: {
          created_at: string | null
          criteria_text: string
          id: string
          question_type: string
          target_level: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criteria_text: string
          id?: string
          question_type: string
          target_level: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criteria_text?: string
          id?: string
          question_type?: string
          target_level?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      evaluation_prompts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          model: string | null
          prompt_text: string
          prompt_version: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          model?: string | null
          prompt_text: string
          prompt_version?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          model?: string | null
          prompt_text?: string
          prompt_version?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      master_questions: {
        Row: {
          audio_generated_at: string | null
          audio_url: string | null
          audio_voice: string | null
          created_at: string | null
          id: number
          question_english: string
          question_id: string
          question_korean: string
          question_title: string | null
          question_type: Database["public"]["Enums"]["answer_type"] | null
          survey_type: Database["public"]["Enums"]["survey_type"]
          topic: string
          topic_category: Database["public"]["Enums"]["topic_category"]
          updated_at: string | null
        }
        Insert: {
          audio_generated_at?: string | null
          audio_url?: string | null
          audio_voice?: string | null
          created_at?: string | null
          id?: number
          question_english: string
          question_id: string
          question_korean: string
          question_title?: string | null
          question_type?: Database["public"]["Enums"]["answer_type"] | null
          survey_type: Database["public"]["Enums"]["survey_type"]
          topic: string
          topic_category: Database["public"]["Enums"]["topic_category"]
          updated_at?: string | null
        }
        Update: {
          audio_generated_at?: string | null
          audio_url?: string | null
          audio_voice?: string | null
          created_at?: string | null
          id?: number
          question_english?: string
          question_id?: string
          question_korean?: string
          question_title?: string | null
          question_type?: Database["public"]["Enums"]["answer_type"] | null
          survey_type?: Database["public"]["Enums"]["survey_type"]
          topic?: string
          topic_category?: Database["public"]["Enums"]["topic_category"]
          updated_at?: string | null
        }
        Relationships: []
      }
      mock_test_answers: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          created_at: string | null
          eval_error: string | null
          eval_retry_count: number | null
          eval_status: string | null
          filler_ratio: number | null
          filler_word_count: number | null
          id: string
          long_pause_count: number | null
          meta_only: boolean | null
          pronunciation_assessment: Json | null
          question_id: string | null
          question_number: number
          session_id: string
          skipped: boolean | null
          transcript: string | null
          unfinished_end: boolean | null
          word_count: number | null
          wpm: number | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string | null
          eval_error?: string | null
          eval_retry_count?: number | null
          eval_status?: string | null
          filler_ratio?: number | null
          filler_word_count?: number | null
          id?: string
          long_pause_count?: number | null
          meta_only?: boolean | null
          pronunciation_assessment?: Json | null
          question_id?: string | null
          question_number: number
          session_id: string
          skipped?: boolean | null
          transcript?: string | null
          unfinished_end?: boolean | null
          word_count?: number | null
          wpm?: number | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string | null
          eval_error?: string | null
          eval_retry_count?: number | null
          eval_status?: string | null
          filler_ratio?: number | null
          filler_word_count?: number | null
          id?: string
          long_pause_count?: number | null
          meta_only?: boolean | null
          pronunciation_assessment?: Json | null
          question_id?: string | null
          question_number?: number
          session_id?: string
          skipped?: boolean | null
          transcript?: string | null
          unfinished_end?: boolean | null
          word_count?: number | null
          wpm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mock_test_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      mock_test_consults: {
        Row: {
          directions: Json
          evaluated_at: string
          fulfillment: string
          id: string
          model: string
          observation: string
          processing_time_ms: number
          question_id: string
          question_number: number
          question_type: string
          session_id: string
          skipped_by_preprocess: boolean
          target_grade: string
          task_checklist: Json
          tokens_used: number
          user_id: string
          weak_points: Json
        }
        Insert: {
          directions?: Json
          evaluated_at?: string
          fulfillment: string
          id?: string
          model?: string
          observation?: string
          processing_time_ms?: number
          question_id: string
          question_number: number
          question_type: string
          session_id: string
          skipped_by_preprocess?: boolean
          target_grade: string
          task_checklist?: Json
          tokens_used?: number
          user_id: string
          weak_points?: Json
        }
        Update: {
          directions?: Json
          evaluated_at?: string
          fulfillment?: string
          id?: string
          model?: string
          observation?: string
          processing_time_ms?: number
          question_id?: string
          question_number?: number
          question_type?: string
          session_id?: string
          skipped_by_preprocess?: boolean
          target_grade?: string
          task_checklist?: Json
          tokens_used?: number
          user_id?: string
          weak_points?: Json
        }
        Relationships: []
      }
      mock_test_evaluations: {
        Row: {
          checkbox_type: string
          checkboxes: Json
          evaluated_at: string
          fail_count: number
          id: string
          model: string
          pass_count: number
          pass_rate: number
          processing_time_ms: number
          question_id: string
          question_number: number
          question_type: string
          session_id: string
          skipped_by_preprocess: boolean
          target_grade: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          checkbox_type?: string
          checkboxes?: Json
          evaluated_at?: string
          fail_count?: number
          id?: string
          model?: string
          pass_count?: number
          pass_rate?: number
          processing_time_ms?: number
          question_id: string
          question_number: number
          question_type: string
          session_id: string
          skipped_by_preprocess?: boolean
          target_grade: string
          tokens_used?: number
          user_id: string
        }
        Update: {
          checkbox_type?: string
          checkboxes?: Json
          evaluated_at?: string
          fail_count?: number
          id?: string
          model?: string
          pass_count?: number
          pass_rate?: number
          processing_time_ms?: number
          question_id?: string
          question_number?: number
          question_type?: string
          session_id?: string
          skipped_by_preprocess?: boolean
          target_grade?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_evaluations_v2_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mock_test_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      mock_test_reports: {
        Row: {
          aggregated_checkboxes: Json | null
          completed_at: string | null
          created_at: string
          final_level: string | null
          growth: Json
          id: string
          model: string
          overview: Json
          processing_time_ms: number
          rule_engine_result: Json | null
          session_id: string
          status: string
          target_level: string | null
          tokens_used: number
          user_id: string
        }
        Insert: {
          aggregated_checkboxes?: Json | null
          completed_at?: string | null
          created_at?: string
          final_level?: string | null
          growth?: Json
          id?: string
          model?: string
          overview?: Json
          processing_time_ms?: number
          rule_engine_result?: Json | null
          session_id: string
          status?: string
          target_level?: string | null
          tokens_used?: number
          user_id: string
        }
        Update: {
          aggregated_checkboxes?: Json | null
          completed_at?: string | null
          created_at?: string
          final_level?: string | null
          growth?: Json
          id?: string
          model?: string
          overview?: Json
          processing_time_ms?: number
          rule_engine_result?: Json | null
          session_id?: string
          status?: string
          target_level?: string | null
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_reports_v2_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "mock_test_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      mock_test_sessions: {
        Row: {
          completed_at: string | null
          current_question: number | null
          expires_at: string
          holistic_status: string | null
          id: string
          mode: string
          question_ids: string[]
          report_error: string | null
          report_retry_count: number | null
          session_id: string
          started_at: string | null
          status: string
          submission_id: number
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_question?: number | null
          expires_at: string
          holistic_status?: string | null
          id?: string
          mode: string
          question_ids: string[]
          report_error?: string | null
          report_retry_count?: number | null
          session_id: string
          started_at?: string | null
          status?: string
          submission_id: number
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_question?: number | null
          expires_at?: string
          holistic_status?: string | null
          id?: string
          mode?: string
          question_ids?: string[]
          report_error?: string | null
          report_retry_count?: number | null
          session_id?: string
          started_at?: string | null
          status?: string
          submission_id?: number
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_sessions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      opic_tips: {
        Row: {
          applicable_levels: string[]
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          expression: string
          id: number
          is_active: boolean | null
          question_type: string | null
          title: string
        }
        Insert: {
          applicable_levels?: string[]
          category: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          expression: string
          id?: number
          is_active?: boolean | null
          question_type?: string | null
          title: string
        }
        Update: {
          applicable_levels?: string[]
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          expression?: string
          id?: number
          is_active?: boolean | null
          question_type?: string | null
          title?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_name: string
          paid_at: string | null
          pay_method: string | null
          payment_id: string | null
          pg_provider: string | null
          pg_tx_id: string | null
          product_id: string
          receipt_url: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_name: string
          paid_at?: string | null
          pay_method?: string | null
          payment_id?: string | null
          pg_provider?: string | null
          pg_tx_id?: string | null
          product_id: string
          receipt_url?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_name?: string
          paid_at?: string | null
          pay_method?: string | null
          payment_id?: string | null
          pg_provider?: string | null
          pg_tx_id?: string | null
          product_id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          target_grade: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          target_grade?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          target_grade?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          audio_url: string | null
          category: string
          created_at: string
          id: string
          question_english: string
          question_korean: string
          question_short: string
          question_type_eng: string
          question_type_kor: string
          sub_category: string
          survey_type: string
          tag: string
          topic: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          category: string
          created_at?: string
          id: string
          question_english?: string
          question_korean?: string
          question_short?: string
          question_type_eng?: string
          question_type_kor?: string
          sub_category?: string
          survey_type: string
          tag?: string
          topic: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          category?: string
          created_at?: string
          id?: string
          question_english?: string
          question_korean?: string
          question_short?: string
          question_type_eng?: string
          question_type_kor?: string
          sub_category?: string
          survey_type?: string
          tag?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      script_packages: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          json_file_path: string | null
          progress: number | null
          script_id: string
          status: string | null
          timestamp_data: Json | null
          tts_voice: string | null
          user_id: string
          wav_file_path: string | null
          wav_file_size: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          json_file_path?: string | null
          progress?: number | null
          script_id: string
          status?: string | null
          timestamp_data?: Json | null
          tts_voice?: string | null
          user_id: string
          wav_file_path?: string | null
          wav_file_size?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          json_file_path?: string | null
          progress?: number | null
          script_id?: string
          status?: string | null
          timestamp_data?: Json | null
          tts_voice?: string | null
          user_id?: string
          wav_file_path?: string | null
          wav_file_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "script_packages_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_specs: {
        Row: {
          created_at: string | null
          eval_criteria: string
          example_output: Json
          guide_id: string
          id: number
          level_constraints: string
          question_type: string
          slot_structure: string
          target_level: string
          total_slots: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          eval_criteria: string
          example_output: Json
          guide_id: string
          id?: number
          level_constraints: string
          question_type: string
          slot_structure: string
          target_level: string
          total_slots: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          eval_criteria?: string
          example_output?: Json
          guide_id?: string
          id?: number
          level_constraints?: string
          question_type?: string
          slot_structure?: string
          target_level?: string
          total_slots?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      scripts: {
        Row: {
          ai_model: string | null
          category: string | null
          created_at: string | null
          english_text: string
          generation_time: number | null
          highlighted_script: string | null
          id: string
          key_expressions: Json | null
          korean_translation: string | null
          paragraphs: Json | null
          question_english: string | null
          question_id: string
          question_korean: string | null
          question_type: string | null
          refine_count: number
          source: string
          status: string
          target_level: string | null
          title: string | null
          topic: string | null
          total_slots: number | null
          updated_at: string | null
          user_id: string
          user_original_answer: string | null
          user_story: string | null
          word_count: number | null
        }
        Insert: {
          ai_model?: string | null
          category?: string | null
          created_at?: string | null
          english_text: string
          generation_time?: number | null
          highlighted_script?: string | null
          id?: string
          key_expressions?: Json | null
          korean_translation?: string | null
          paragraphs?: Json | null
          question_english?: string | null
          question_id: string
          question_korean?: string | null
          question_type?: string | null
          refine_count?: number
          source?: string
          status?: string
          target_level?: string | null
          title?: string | null
          topic?: string | null
          total_slots?: number | null
          updated_at?: string | null
          user_id: string
          user_original_answer?: string | null
          user_story?: string | null
          word_count?: number | null
        }
        Update: {
          ai_model?: string | null
          category?: string | null
          created_at?: string | null
          english_text?: string
          generation_time?: number | null
          highlighted_script?: string | null
          id?: string
          key_expressions?: Json | null
          korean_translation?: string | null
          paragraphs?: Json | null
          question_english?: string | null
          question_id?: string
          question_korean?: string | null
          question_type?: string | null
          refine_count?: number
          source?: string
          status?: string
          target_level?: string | null
          title?: string | null
          topic?: string | null
          total_slots?: number | null
          updated_at?: string | null
          user_id?: string
          user_original_answer?: string | null
          user_story?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      shadowing_evaluations: {
        Row: {
          content_score: number | null
          created_at: string | null
          estimated_level: string | null
          fluency: number | null
          grammar: number | null
          id: string
          overall_score: number | null
          pronunciation: number | null
          script_analysis: Json | null
          script_utilization: number | null
          session_id: string
          strengths: string[] | null
          suggestions: string[] | null
          transcript: string
          user_id: string
          vocabulary: number | null
          weaknesses: string[] | null
          word_count: number | null
        }
        Insert: {
          content_score?: number | null
          created_at?: string | null
          estimated_level?: string | null
          fluency?: number | null
          grammar?: number | null
          id?: string
          overall_score?: number | null
          pronunciation?: number | null
          script_analysis?: Json | null
          script_utilization?: number | null
          session_id: string
          strengths?: string[] | null
          suggestions?: string[] | null
          transcript: string
          user_id: string
          vocabulary?: number | null
          weaknesses?: string[] | null
          word_count?: number | null
        }
        Update: {
          content_score?: number | null
          created_at?: string | null
          estimated_level?: string | null
          fluency?: number | null
          grammar?: number | null
          id?: string
          overall_score?: number | null
          pronunciation?: number | null
          script_analysis?: Json | null
          script_utilization?: number | null
          session_id?: string
          strengths?: string[] | null
          suggestions?: string[] | null
          transcript?: string
          user_id?: string
          vocabulary?: number | null
          weaknesses?: string[] | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shadowing_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "shadowing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shadowing_sessions: {
        Row: {
          audio_duration: number | null
          completed_at: string | null
          id: string
          package_id: string
          question_korean: string | null
          question_text: string | null
          script_id: string
          started_at: string | null
          status: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          audio_duration?: number | null
          completed_at?: string | null
          id?: string
          package_id: string
          question_korean?: string | null
          question_text?: string | null
          script_id: string
          started_at?: string | null
          status?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          audio_duration?: number | null
          completed_at?: string | null
          id?: string
          package_id?: string
          question_korean?: string | null
          question_text?: string | null
          script_id?: string
          started_at?: string | null
          status?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shadowing_sessions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "script_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shadowing_sessions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_combos: {
        Row: {
          combo_type: string
          created_at: string | null
          id: number
          question_ids: string[]
          submission_id: number
          topic: string
        }
        Insert: {
          combo_type: string
          created_at?: string | null
          id?: number
          question_ids: string[]
          submission_id: number
          topic: string
        }
        Update: {
          combo_type?: string
          created_at?: string | null
          id?: number
          question_ids?: string[]
          submission_id?: number
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_combos_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_questions: {
        Row: {
          combo_type: string
          created_at: string | null
          custom_question_text: string | null
          id: number
          is_not_remembered: boolean | null
          question_id: string | null
          question_number: number
          submission_id: number
          topic: string
        }
        Insert: {
          combo_type: string
          created_at?: string | null
          custom_question_text?: string | null
          id?: number
          is_not_remembered?: boolean | null
          question_id?: string | null
          question_number: number
          submission_id: number
          topic: string
        }
        Update: {
          combo_type?: string
          created_at?: string | null
          custom_question_text?: string | null
          id?: number
          is_not_remembered?: boolean | null
          question_id?: string | null
          question_number?: number
          submission_id?: number
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_questions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          achieved_level: string | null
          actual_duration: string
          attempt_count: string
          created_at: string | null
          credit_granted: boolean
          exam_approved: string | null
          exam_approved_at: string | null
          exam_date: string
          exam_difficulty: string | null
          exam_purpose: string
          id: number
          one_line_review: string | null
          perceived_difficulty: string
          pre_exam_level: string
          prep_duration: string
          source: string
          status: string
          step_completed: number
          study_methods: string[]
          submitted_at: string | null
          survey_course: string | null
          survey_hobbies: string | null
          survey_housing: string | null
          survey_leisure: string | null
          survey_occupation: string | null
          survey_sports: string | null
          survey_student: string | null
          survey_travel: string | null
          tips: string | null
          updated_at: string | null
          used_recommended_survey: boolean
          user_id: string
        }
        Insert: {
          achieved_level?: string | null
          actual_duration: string
          attempt_count: string
          created_at?: string | null
          credit_granted?: boolean
          exam_approved?: string | null
          exam_approved_at?: string | null
          exam_date: string
          exam_difficulty?: string | null
          exam_purpose: string
          id?: number
          one_line_review?: string | null
          perceived_difficulty: string
          pre_exam_level: string
          prep_duration: string
          source?: string
          status?: string
          step_completed?: number
          study_methods: string[]
          submitted_at?: string | null
          survey_course?: string | null
          survey_hobbies?: string | null
          survey_housing?: string | null
          survey_leisure?: string | null
          survey_occupation?: string | null
          survey_sports?: string | null
          survey_student?: string | null
          survey_travel?: string | null
          tips?: string | null
          updated_at?: string | null
          used_recommended_survey?: boolean
          user_id: string
        }
        Update: {
          achieved_level?: string | null
          actual_duration?: string
          attempt_count?: string
          created_at?: string | null
          credit_granted?: boolean
          exam_approved?: string | null
          exam_approved_at?: string | null
          exam_date?: string
          exam_difficulty?: string | null
          exam_purpose?: string
          id?: number
          one_line_review?: string | null
          perceived_difficulty?: string
          pre_exam_level?: string
          prep_duration?: string
          source?: string
          status?: string
          step_completed?: number
          study_methods?: string[]
          submitted_at?: string | null
          survey_course?: string | null
          survey_hobbies?: string | null
          survey_housing?: string | null
          survey_leisure?: string | null
          survey_occupation?: string | null
          survey_sports?: string | null
          survey_student?: string | null
          survey_travel?: string | null
          tips?: string | null
          updated_at?: string | null
          used_recommended_survey?: boolean
          user_id?: string
        }
        Relationships: []
      }
      task_fulfillment_checklists: {
        Row: {
          advanced: Json
          common_mistakes: Json
          core_prescription: string
          feedback_tone: string
          ideal_flow: string
          label: string
          question_type: string
          required: Json
          start_template: string
          updated_at: string | null
        }
        Insert: {
          advanced?: Json
          common_mistakes?: Json
          core_prescription?: string
          feedback_tone?: string
          ideal_flow?: string
          label: string
          question_type: string
          required?: Json
          start_template?: string
          updated_at?: string | null
        }
        Update: {
          advanced?: Json
          common_mistakes?: Json
          core_prescription?: string
          feedback_tone?: string
          ideal_flow?: string
          label?: string
          question_type?: string
          required?: Json
          start_template?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tutoring_attempts: {
        Row: {
          attempt_number: number | null
          audio_duration_seconds: number | null
          created_at: string | null
          evaluation: Json | null
          id: string
          metrics: Json | null
          passed: boolean | null
          pronunciation: Json | null
          protocol: string | null
          question_id: string | null
          repair_after: string | null
          repair_before: string | null
          repair_type: string | null
          screen_number: number
          training_session_id: string
          user_answer: string | null
          user_audio_url: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number | null
          audio_duration_seconds?: number | null
          created_at?: string | null
          evaluation?: Json | null
          id?: string
          metrics?: Json | null
          passed?: boolean | null
          pronunciation?: Json | null
          protocol?: string | null
          question_id?: string | null
          repair_after?: string | null
          repair_before?: string | null
          repair_type?: string | null
          screen_number: number
          training_session_id: string
          user_answer?: string | null
          user_audio_url?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number | null
          audio_duration_seconds?: number | null
          created_at?: string | null
          evaluation?: Json | null
          id?: string
          metrics?: Json | null
          passed?: boolean | null
          pronunciation?: Json | null
          protocol?: string | null
          question_id?: string | null
          repair_after?: string | null
          repair_before?: string | null
          repair_type?: string | null
          screen_number?: number
          training_session_id?: string
          user_answer?: string | null
          user_audio_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_attempts_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "tutoring_training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_prescriptions: {
        Row: {
          best_score: Json | null
          created_at: string | null
          id: string
          level_params: Json | null
          priority: number
          question_type: string
          session_id: string
          source: string
          source_data: Json | null
          status: string | null
          topic_id: string | null
          training_count: number | null
          user_id: string
          weakness_tags: Json | null
        }
        Insert: {
          best_score?: Json | null
          created_at?: string | null
          id?: string
          level_params?: Json | null
          priority: number
          question_type: string
          session_id: string
          source: string
          source_data?: Json | null
          status?: string | null
          topic_id?: string | null
          training_count?: number | null
          user_id: string
          weakness_tags?: Json | null
        }
        Update: {
          best_score?: Json | null
          created_at?: string | null
          id?: string
          level_params?: Json | null
          priority?: number
          question_type?: string
          session_id?: string
          source?: string
          source_data?: Json | null
          status?: string | null
          topic_id?: string | null
          training_count?: number | null
          user_id?: string
          weakness_tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_prescriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tutoring_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_review_schedule: {
        Row: {
          created_at: string | null
          id: string
          interval_days: number | null
          next_review_at: string
          prescription_id: string
          question_type: string
          review_count: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interval_days?: number | null
          next_review_at: string
          prescription_id: string
          question_type: string
          review_count?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interval_days?: number | null
          next_review_at?: string
          prescription_id?: string
          question_type?: string
          review_count?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_review_schedule_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "tutoring_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutoring_sessions: {
        Row: {
          completed_prescriptions: number | null
          created_at: string | null
          current_level: string | null
          id: string
          last_activity_at: string | null
          mock_test_session_id: string
          started_at: string | null
          status: string | null
          target_level: string | null
          total_prescriptions: number | null
          user_id: string
        }
        Insert: {
          completed_prescriptions?: number | null
          created_at?: string | null
          current_level?: string | null
          id?: string
          last_activity_at?: string | null
          mock_test_session_id: string
          started_at?: string | null
          status?: string | null
          target_level?: string | null
          total_prescriptions?: number | null
          user_id: string
        }
        Update: {
          completed_prescriptions?: number | null
          created_at?: string | null
          current_level?: string | null
          id?: string
          last_activity_at?: string | null
          mock_test_session_id?: string
          started_at?: string | null
          status?: string | null
          target_level?: string | null
          total_prescriptions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tutoring_skill_history: {
        Row: {
          avg_connector_count: number | null
          avg_filler_pct: number | null
          avg_silence_seconds: number | null
          avg_structure_score: number | null
          avg_wpm: number | null
          block_completion_rate: number | null
          id: string
          question_type: string | null
          recorded_at: string | null
          self_repair_count: number | null
          source: string
          source_id: string | null
          user_id: string
          variation_success_rate: number | null
        }
        Insert: {
          avg_connector_count?: number | null
          avg_filler_pct?: number | null
          avg_silence_seconds?: number | null
          avg_structure_score?: number | null
          avg_wpm?: number | null
          block_completion_rate?: number | null
          id?: string
          question_type?: string | null
          recorded_at?: string | null
          self_repair_count?: number | null
          source: string
          source_id?: string | null
          user_id: string
          variation_success_rate?: number | null
        }
        Update: {
          avg_connector_count?: number | null
          avg_filler_pct?: number | null
          avg_silence_seconds?: number | null
          avg_structure_score?: number | null
          avg_wpm?: number | null
          block_completion_rate?: number | null
          id?: string
          question_type?: string | null
          recorded_at?: string | null
          self_repair_count?: number | null
          source?: string
          source_id?: string | null
          user_id?: string
          variation_success_rate?: number | null
        }
        Relationships: []
      }
      tutoring_training_sessions: {
        Row: {
          completed_at: string | null
          duration_seconds: number | null
          id: string
          kpi_results: Json | null
          level_params: Json | null
          next_recommendation: Json | null
          overall_score: Json | null
          prescription_id: string | null
          question_type: string
          screens_completed: number | null
          session_goal: string | null
          session_type: string | null
          started_at: string | null
          success_criteria: Json | null
          target_level: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          kpi_results?: Json | null
          level_params?: Json | null
          next_recommendation?: Json | null
          overall_score?: Json | null
          prescription_id?: string | null
          question_type: string
          screens_completed?: number | null
          session_goal?: string | null
          session_type?: string | null
          started_at?: string | null
          success_criteria?: Json | null
          target_level?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          kpi_results?: Json | null
          level_params?: Json | null
          next_recommendation?: Json | null
          overall_score?: Json | null
          prescription_id?: string | null
          question_type?: string
          screens_completed?: number | null
          session_goal?: string | null
          session_type?: string | null
          started_at?: string | null
          success_criteria?: Json | null
          target_level?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutoring_training_sessions_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "tutoring_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string | null
          current_plan: string
          mock_exam_credits: number
          plan_expires_at: string | null
          plan_mock_exam_credits: number
          plan_script_credits: number
          plan_tutoring_credits: number
          script_credits: number
          tutoring_credits: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_plan?: string
          mock_exam_credits?: number
          plan_expires_at?: string | null
          plan_mock_exam_credits?: number
          plan_script_credits?: number
          plan_tutoring_credits?: number
          script_credits?: number
          tutoring_credits?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_plan?: string
          mock_exam_credits?: number
          plan_expires_at?: string | null
          plan_mock_exam_credits?: number
          plan_script_credits?: number
          plan_tutoring_credits?: number
          script_credits?: number
          tutoring_credits?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wp_type_priority: {
        Row: {
          anti_overtagging: string | null
          created_at: string | null
          critical_combo: string | null
          gatekeeper: string[]
          id: string
          interpretation_notes: string | null
          question_type: string
          updated_at: string | null
          wp_low: string[]
          wp_primary: string[]
          wp_secondary: string[]
        }
        Insert: {
          anti_overtagging?: string | null
          created_at?: string | null
          critical_combo?: string | null
          gatekeeper: string[]
          id?: string
          interpretation_notes?: string | null
          question_type: string
          updated_at?: string | null
          wp_low: string[]
          wp_primary: string[]
          wp_secondary: string[]
        }
        Update: {
          anti_overtagging?: string | null
          created_at?: string | null
          critical_combo?: string | null
          gatekeeper?: string[]
          id?: string
          interpretation_notes?: string | null
          question_type?: string
          updated_at?: string | null
          wp_low?: string[]
          wp_primary?: string[]
          wp_secondary?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_mock_exam_credit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      consume_script_credit: { Args: { p_user_id: string }; Returns: boolean }
      consume_tutoring_credit: { Args: { p_user_id: string }; Returns: boolean }
      get_dau_count: {
        Args: { target_date: string }
        Returns: {
          count: number
        }[]
      }
      increment_completed_prescriptions: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      increment_script_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      increment_training_count: {
        Args: { p_prescription_id: string }
        Returns: undefined
      }
      process_payment: {
        Args: {
          p_amount: number
          p_is_plan?: boolean
          p_mock_exam_credits?: number
          p_order_name: string
          p_paid_at?: string
          p_pay_method?: string
          p_payment_id: string
          p_pg_provider?: string
          p_pg_tx_id?: string
          p_plan?: string
          p_plan_months?: number
          p_product_id: string
          p_receipt_url?: string
          p_script_credits?: number
          p_tutoring_credits?: number
          p_user_id: string
        }
        Returns: Json
      }
      refund_mock_exam_credit: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refund_script_credit: { Args: { p_user_id: string }; Returns: undefined }
      refund_tutoring_credit: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      answer_type:
        | "description"
        | "routine"
        | "comparison"
        | "past_experience_memorable"
        | "past_experience_recent"
        | "past_experience_childhood"
        | "roleplay_11"
        | "roleplay_12"
        | "roleplay_13"
        | "advanced_14"
        | "advanced_15"
      survey_type: "선택형" | "공통형" | "롤플레이" | "시스템"
      topic_category: "일반" | "롤플레이" | "어드밴스" | "시스템"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      answer_type: [
        "description",
        "routine",
        "comparison",
        "past_experience_memorable",
        "past_experience_recent",
        "past_experience_childhood",
        "roleplay_11",
        "roleplay_12",
        "roleplay_13",
        "advanced_14",
        "advanced_15",
      ],
      survey_type: ["선택형", "공통형", "롤플레이", "시스템"],
      topic_category: ["일반", "롤플레이", "어드밴스", "시스템"],
    },
  },
} as const
