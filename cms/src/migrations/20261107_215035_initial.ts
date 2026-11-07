import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_pages_blocks_hero_buttons_style" AS ENUM('primaryBig', 'primary', 'ghosted', 'devBig', 'btn', 'cardLink', 'devlink', 'plain');
  CREATE TYPE "public"."enum_pages_blocks_hero_variant" AS ENUM('home', 'intro', 'landing');
  CREATE TYPE "public"."enum_pages_blocks_hero_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum_pages_blocks_text_buttons_style" AS ENUM('primaryBig', 'primary', 'ghosted', 'devBig', 'btn', 'cardLink', 'devlink', 'plain');
  CREATE TYPE "public"."enum_pages_blocks_text_variant" AS ENUM('default', 'callout', 'about', 'why', 'legal');
  CREATE TYPE "public"."enum_pages_blocks_text_heading_level" AS ENUM('h1', 'h2');
  CREATE TYPE "public"."enum_pages_blocks_text_list_class" AS ENUM('none', 'why-points', 'examples', 'facts', 'excl');
  CREATE TYPE "public"."enum_pages_blocks_text_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum_pages_blocks_cards_cards_buttons_style" AS ENUM('primaryBig', 'primary', 'ghosted', 'devBig', 'btn', 'cardLink', 'devlink', 'plain');
  CREATE TYPE "public"."enum_pages_blocks_cards_cards_icon" AS ENUM('none');
  CREATE TYPE "public"."enum_pages_blocks_cards_cards_accent" AS ENUM('none', 'infra', 'dev', 'live');
  CREATE TYPE "public"."enum_pages_blocks_cards_variant" AS ENUM('fields', 'why', 'objections', 'explore', 'projects', 'demos');
  CREATE TYPE "public"."enum_pages_blocks_cards_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum_pages_blocks_steps_variant" AS ENUM('fields');
  CREATE TYPE "public"."enum_pages_blocks_steps_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum_pages_blocks_faq_variant" AS ENUM('default');
  CREATE TYPE "public"."enum_pages_blocks_cta_bar_buttons_style" AS ENUM('primaryBig', 'primary', 'ghosted', 'devBig', 'btn', 'cardLink', 'devlink', 'plain');
  CREATE TYPE "public"."enum_pages_blocks_cta_bar_variant" AS ENUM('default', 'buttonsFirst');
  CREATE TYPE "public"."enum_pages_blocks_figure_variant" AS ENUM('default', 'beleg');
  CREATE TYPE "public"."enum_pages_blocks_figure_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum_pages_blocks_contact_form_variant" AS ENUM('default');
  CREATE TYPE "public"."enum_pages_blocks_contact_form_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum_pages_blocks_vmware_calculator_variant" AS ENUM('default');
  CREATE TYPE "public"."enum_pages_structured_data" AS ENUM('none', 'home');
  CREATE TYPE "public"."enum_pages_frame" AS ENUM('home', 'subpage', 'subpageTabs', 'landing', 'legal', 'legalWrap');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_buttons_style" AS ENUM('primaryBig', 'primary', 'ghosted', 'devBig', 'btn', 'cardLink', 'devlink', 'plain');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_variant" AS ENUM('home', 'intro', 'landing');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum__pages_v_blocks_text_buttons_style" AS ENUM('primaryBig', 'primary', 'ghosted', 'devBig', 'btn', 'cardLink', 'devlink', 'plain');
  CREATE TYPE "public"."enum__pages_v_blocks_text_variant" AS ENUM('default', 'callout', 'about', 'why', 'legal');
  CREATE TYPE "public"."enum__pages_v_blocks_text_heading_level" AS ENUM('h1', 'h2');
  CREATE TYPE "public"."enum__pages_v_blocks_text_list_class" AS ENUM('none', 'why-points', 'examples', 'facts', 'excl');
  CREATE TYPE "public"."enum__pages_v_blocks_text_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_cards_buttons_style" AS ENUM('primaryBig', 'primary', 'ghosted', 'devBig', 'btn', 'cardLink', 'devlink', 'plain');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_cards_icon" AS ENUM('none');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_cards_accent" AS ENUM('none', 'infra', 'dev', 'live');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_variant" AS ENUM('fields', 'why', 'objections', 'explore', 'projects', 'demos');
  CREATE TYPE "public"."enum__pages_v_blocks_cards_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum__pages_v_blocks_steps_variant" AS ENUM('fields');
  CREATE TYPE "public"."enum__pages_v_blocks_steps_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_variant" AS ENUM('default');
  CREATE TYPE "public"."enum__pages_v_blocks_cta_bar_buttons_style" AS ENUM('primaryBig', 'primary', 'ghosted', 'devBig', 'btn', 'cardLink', 'devlink', 'plain');
  CREATE TYPE "public"."enum__pages_v_blocks_cta_bar_variant" AS ENUM('default', 'buttonsFirst');
  CREATE TYPE "public"."enum__pages_v_blocks_figure_variant" AS ENUM('default', 'beleg');
  CREATE TYPE "public"."enum__pages_v_blocks_figure_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum__pages_v_blocks_contact_form_variant" AS ENUM('default');
  CREATE TYPE "public"."enum__pages_v_blocks_contact_form_note_class" AS ENUM('note', 'callout-note', 'trust-bar', 'plain-mail', 'muted', 'r-hint', 'source-note');
  CREATE TYPE "public"."enum__pages_v_blocks_vmware_calculator_variant" AS ENUM('default');
  CREATE TYPE "public"."enum__pages_v_version_structured_data" AS ENUM('none', 'home');
  CREATE TYPE "public"."enum__pages_v_version_frame" AS ENUM('home', 'subpage', 'subpageTabs', 'landing', 'legal', 'legalWrap');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_publish_status_state" AS ENUM('running', 'live', 'failed');
  CREATE TYPE "public"."enum_publish_status_action" AS ENUM('publish', 'rollback');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"public_path" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_sm_url" varchar,
  	"sizes_sm_width" numeric,
  	"sizes_sm_height" numeric,
  	"sizes_sm_mime_type" varchar,
  	"sizes_sm_filesize" numeric,
  	"sizes_sm_filename" varchar,
  	"sizes_md_url" varchar,
  	"sizes_md_width" numeric,
  	"sizes_md_height" numeric,
  	"sizes_md_mime_type" varchar,
  	"sizes_md_filesize" numeric,
  	"sizes_md_filename" varchar,
  	"sizes_lg_url" varchar,
  	"sizes_lg_width" numeric,
  	"sizes_lg_height" numeric,
  	"sizes_lg_mime_type" varchar,
  	"sizes_lg_filesize" numeric,
  	"sizes_lg_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero_trust_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero_trust_points_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"style" "enum_pages_blocks_hero_buttons_style" DEFAULT 'primary',
  	"icon" varchar,
  	"new_tab" boolean,
  	"download" boolean
  );
  
  CREATE TABLE "pages_blocks_hero_buttons_locales" (
  	"label" varchar,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_hero_variant" DEFAULT 'home',
  	"note_class" "enum_pages_blocks_hero_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_locales" (
  	"anchor_id" varchar,
  	"eyebrow" varchar,
  	"h1" varchar,
  	"claim" jsonb,
  	"photo_id" integer,
  	"photo_alt" varchar,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_text_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"style" "enum_pages_blocks_text_buttons_style" DEFAULT 'primary',
  	"icon" varchar,
  	"new_tab" boolean,
  	"download" boolean
  );
  
  CREATE TABLE "pages_blocks_text_buttons_locales" (
  	"label" varchar,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_text_variant" DEFAULT 'default',
  	"heading_level" "enum_pages_blocks_text_heading_level" DEFAULT 'h2',
  	"list_class" "enum_pages_blocks_text_list_class" DEFAULT 'none',
  	"note_class" "enum_pages_blocks_text_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_text_locales" (
  	"anchor_id" varchar,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"sub" varchar,
  	"lead" jsonb,
  	"body" jsonb,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cards_cards_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cards_cards_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cards_cards_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"style" "enum_pages_blocks_cards_cards_buttons_style" DEFAULT 'primary',
  	"icon" varchar,
  	"new_tab" boolean,
  	"download" boolean
  );
  
  CREATE TABLE "pages_blocks_cards_cards_buttons_locales" (
  	"label" varchar,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cards_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_pages_blocks_cards_cards_icon" DEFAULT 'none',
  	"accent" "enum_pages_blocks_cards_cards_accent" DEFAULT 'none',
  	"link_new_tab" boolean
  );
  
  CREATE TABLE "pages_blocks_cards_cards_locales" (
  	"image_id" integer,
  	"image_alt" varchar,
  	"eyebrow" varchar,
  	"tag" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"badge" varchar,
  	"text" jsonb,
  	"link_href" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_cards_variant" DEFAULT 'fields',
  	"note_class" "enum_pages_blocks_cards_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cards_locales" (
  	"anchor_id" varchar,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"lead" jsonb,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_steps_steps_locales" (
  	"label" varchar,
  	"title" varchar,
  	"text" jsonb,
  	"dauer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_steps_variant" DEFAULT 'fields',
  	"note_class" "enum_pages_blocks_steps_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_steps_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_faq_variant" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cta_bar_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"style" "enum_pages_blocks_cta_bar_buttons_style" DEFAULT 'primary',
  	"icon" varchar,
  	"new_tab" boolean,
  	"download" boolean
  );
  
  CREATE TABLE "pages_blocks_cta_bar_buttons_locales" (
  	"label" varchar,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cta_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_cta_bar_variant" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cta_bar_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_figure" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_figure_variant" DEFAULT 'default',
  	"note_class" "enum_pages_blocks_figure_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_figure_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"image_id" integer,
  	"alt" varchar,
  	"caption" jsonb,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_form_hints" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_form_hints_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_form_request_type_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_form_request_type_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_form_urgency_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_form_urgency_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_contact_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_contact_form_variant" DEFAULT 'default',
  	"note_class" "enum_pages_blocks_contact_form_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_contact_form_locales" (
  	"anchor_id" varchar,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"lead" jsonb,
  	"messages_error" varchar,
  	"messages_fallback" varchar,
  	"messages_copy_label" varchar,
  	"messages_copied_label" varchar,
  	"name_label" varchar,
  	"name_data_label" varchar,
  	"email_label" varchar,
  	"email_data_label" varchar,
  	"phone_label" varchar,
  	"phone_data_label" varchar,
  	"message_label" varchar,
  	"message_data_label" varchar,
  	"message_placeholder" varchar,
  	"more_summary" varchar,
  	"company_label" varchar,
  	"company_data_label" varchar,
  	"request_type_label" varchar,
  	"request_type_data_label" varchar,
  	"urgency_label" varchar,
  	"urgency_data_label" varchar,
  	"form_hint" varchar,
  	"submit" varchar,
  	"booking_or" varchar,
  	"booking_button" varchar,
  	"booking_icon" varchar,
  	"booking_hint" varchar,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_editions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_editions_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_tiers_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_months" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_months_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_features_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum_pages_blocks_vmware_calculator_variant" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_vmware_calculator_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"labels_hosts" varchar,
  	"labels_vms" varchar,
  	"labels_sockets" varchar,
  	"labels_cores" varchar,
  	"labels_cost_legend" varchar,
  	"labels_cost_known" varchar,
  	"labels_cost_estimate" varchar,
  	"labels_vmware_cost" varchar,
  	"labels_vmware_cost_placeholder" varchar,
  	"labels_edition" varchar,
  	"labels_estimate_hint" varchar,
  	"labels_proxmox_tier" varchar,
  	"labels_contract_end" varchar,
  	"labels_month_aria" varchar,
  	"labels_year_aria" varchar,
  	"labels_features_legend" varchar,
  	"labels_calculate" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"slug_en" varchar,
  	"translation_key" varchar,
  	"bilingual" boolean DEFAULT true,
  	"noindex" boolean DEFAULT false,
  	"minimal_header" boolean DEFAULT false,
  	"structured_data" "enum_pages_structured_data" DEFAULT 'none',
  	"frame" "enum_pages_frame" DEFAULT 'subpage',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"description" varchar,
  	"og_title" varchar,
  	"og_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero_trust_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_trust_points_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"style" "enum__pages_v_blocks_hero_buttons_style" DEFAULT 'primary',
  	"icon" varchar,
  	"new_tab" boolean,
  	"download" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_buttons_locales" (
  	"label" varchar,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_hero_variant" DEFAULT 'home',
  	"note_class" "enum__pages_v_blocks_hero_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_locales" (
  	"anchor_id" varchar,
  	"eyebrow" varchar,
  	"h1" varchar,
  	"claim" jsonb,
  	"photo_id" integer,
  	"photo_alt" varchar,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_text_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"style" "enum__pages_v_blocks_text_buttons_style" DEFAULT 'primary',
  	"icon" varchar,
  	"new_tab" boolean,
  	"download" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_text_buttons_locales" (
  	"label" varchar,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_text_variant" DEFAULT 'default',
  	"heading_level" "enum__pages_v_blocks_text_heading_level" DEFAULT 'h2',
  	"list_class" "enum__pages_v_blocks_text_list_class" DEFAULT 'none',
  	"note_class" "enum__pages_v_blocks_text_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_text_locales" (
  	"anchor_id" varchar,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"sub" varchar,
  	"lead" jsonb,
  	"body" jsonb,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cards_cards_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards_cards_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cards_cards_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"style" "enum__pages_v_blocks_cards_cards_buttons_style" DEFAULT 'primary',
  	"icon" varchar,
  	"new_tab" boolean,
  	"download" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards_cards_buttons_locales" (
  	"label" varchar,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cards_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__pages_v_blocks_cards_cards_icon" DEFAULT 'none',
  	"accent" "enum__pages_v_blocks_cards_cards_accent" DEFAULT 'none',
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards_cards_locales" (
  	"image_id" integer,
  	"image_alt" varchar,
  	"eyebrow" varchar,
  	"tag" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"badge" varchar,
  	"text" jsonb,
  	"link_href" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_cards_variant" DEFAULT 'fields',
  	"note_class" "enum__pages_v_blocks_cards_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards_locales" (
  	"anchor_id" varchar,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"lead" jsonb,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_steps_steps_locales" (
  	"label" varchar,
  	"title" varchar,
  	"text" jsonb,
  	"dauer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_steps_variant" DEFAULT 'fields',
  	"note_class" "enum__pages_v_blocks_steps_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_steps_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_faq_variant" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cta_bar_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"style" "enum__pages_v_blocks_cta_bar_buttons_style" DEFAULT 'primary',
  	"icon" varchar,
  	"new_tab" boolean,
  	"download" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta_bar_buttons_locales" (
  	"label" varchar,
  	"href" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cta_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_cta_bar_variant" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta_bar_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_figure" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_figure_variant" DEFAULT 'default',
  	"note_class" "enum__pages_v_blocks_figure_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_figure_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"image_id" integer,
  	"alt" varchar,
  	"caption" jsonb,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form_hints" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form_hints_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form_request_type_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form_request_type_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form_urgency_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form_urgency_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_contact_form_variant" DEFAULT 'default',
  	"note_class" "enum__pages_v_blocks_contact_form_note_class" DEFAULT 'note',
  	"note_icon" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact_form_locales" (
  	"anchor_id" varchar,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"lead" jsonb,
  	"messages_error" varchar,
  	"messages_fallback" varchar,
  	"messages_copy_label" varchar,
  	"messages_copied_label" varchar,
  	"name_label" varchar,
  	"name_data_label" varchar,
  	"email_label" varchar,
  	"email_data_label" varchar,
  	"phone_label" varchar,
  	"phone_data_label" varchar,
  	"message_label" varchar,
  	"message_data_label" varchar,
  	"message_placeholder" varchar,
  	"more_summary" varchar,
  	"company_label" varchar,
  	"company_data_label" varchar,
  	"request_type_label" varchar,
  	"request_type_data_label" varchar,
  	"urgency_label" varchar,
  	"urgency_data_label" varchar,
  	"form_hint" varchar,
  	"submit" varchar,
  	"booking_or" varchar,
  	"booking_button" varchar,
  	"booking_icon" varchar,
  	"booking_hint" varchar,
  	"note" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_editions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_editions_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_tiers_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_months" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_months_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_features_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_key" varchar,
  	"variant" "enum__pages_v_blocks_vmware_calculator_variant" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_vmware_calculator_locales" (
  	"anchor_id" varchar,
  	"heading" varchar,
  	"labels_hosts" varchar,
  	"labels_vms" varchar,
  	"labels_sockets" varchar,
  	"labels_cores" varchar,
  	"labels_cost_legend" varchar,
  	"labels_cost_known" varchar,
  	"labels_cost_estimate" varchar,
  	"labels_vmware_cost" varchar,
  	"labels_vmware_cost_placeholder" varchar,
  	"labels_edition" varchar,
  	"labels_estimate_hint" varchar,
  	"labels_proxmox_tier" varchar,
  	"labels_contract_end" varchar,
  	"labels_month_aria" varchar,
  	"labels_year_aria" varchar,
  	"labels_features_legend" varchar,
  	"labels_calculate" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_slug_en" varchar,
  	"version_translation_key" varchar,
  	"version_bilingual" boolean DEFAULT true,
  	"version_noindex" boolean DEFAULT false,
  	"version_minimal_header" boolean DEFAULT false,
  	"version_structured_data" "enum__pages_v_version_structured_data" DEFAULT 'none',
  	"version_frame" "enum__pages_v_version_frame" DEFAULT 'subpage',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_og_title" varchar,
  	"version_og_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"pages_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"owner" varchar NOT NULL,
  	"domain" varchar NOT NULL,
  	"tel" varchar NOT NULL,
  	"tel_display" varchar NOT NULL,
  	"tel_href" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"street" varchar NOT NULL,
  	"postal_code" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"region" varchar NOT NULL,
  	"booking" varchar NOT NULL,
  	"portal" varchar NOT NULL,
  	"github" varchar NOT NULL,
  	"logo" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "chrome_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "chrome_footer_legal" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "chrome_subnav_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"label" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "chrome" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "chrome_locales" (
  	"skip" varchar NOT NULL,
  	"home" varchar NOT NULL,
  	"menu_open" varchar NOT NULL,
  	"nav_aria" varchar NOT NULL,
  	"nav_cta" varchar NOT NULL,
  	"portal" varchar NOT NULL,
  	"theme_toggle" varchar NOT NULL,
  	"lang_switch_label" varchar NOT NULL,
  	"lang_switch_code" varchar NOT NULL,
  	"lang_switch_aria" varchar NOT NULL,
  	"lang_switch_fallback" varchar NOT NULL,
  	"footer_legal_aria" varchar NOT NULL,
  	"footer_copyright" varchar NOT NULL,
  	"footer_location" varchar,
  	"footer_github" varchar NOT NULL,
  	"footer_tagline" varchar NOT NULL,
  	"subnav_home" varchar,
  	"subnav_tabs_aria" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "publish_status" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"state" "enum_publish_status_state",
  	"action" "enum_publish_status_action",
  	"at" timestamp(3) with time zone,
  	"release" varchar,
  	"reason" varchar,
  	"warning" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_trust_points" ADD CONSTRAINT "pages_blocks_hero_trust_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_trust_points_locales" ADD CONSTRAINT "pages_blocks_hero_trust_points_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_trust_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_buttons" ADD CONSTRAINT "pages_blocks_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_buttons_locales" ADD CONSTRAINT "pages_blocks_hero_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_text_buttons" ADD CONSTRAINT "pages_blocks_text_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_text_buttons_locales" ADD CONSTRAINT "pages_blocks_text_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_text_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_text" ADD CONSTRAINT "pages_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_text_locales" ADD CONSTRAINT "pages_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_cards_chips" ADD CONSTRAINT "pages_blocks_cards_cards_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_cards_chips_locales" ADD CONSTRAINT "pages_blocks_cards_cards_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards_cards_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_cards_buttons" ADD CONSTRAINT "pages_blocks_cards_cards_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_cards_buttons_locales" ADD CONSTRAINT "pages_blocks_cards_cards_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards_cards_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_cards" ADD CONSTRAINT "pages_blocks_cards_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_cards_locales" ADD CONSTRAINT "pages_blocks_cards_cards_locales_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_cards_locales" ADD CONSTRAINT "pages_blocks_cards_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards" ADD CONSTRAINT "pages_blocks_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards_locales" ADD CONSTRAINT "pages_blocks_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps_steps" ADD CONSTRAINT "pages_blocks_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps_steps_locales" ADD CONSTRAINT "pages_blocks_steps_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_steps_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps" ADD CONSTRAINT "pages_blocks_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps_locales" ADD CONSTRAINT "pages_blocks_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items_locales" ADD CONSTRAINT "pages_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_bar_buttons" ADD CONSTRAINT "pages_blocks_cta_bar_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_bar_buttons_locales" ADD CONSTRAINT "pages_blocks_cta_bar_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta_bar_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_bar" ADD CONSTRAINT "pages_blocks_cta_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_bar_locales" ADD CONSTRAINT "pages_blocks_cta_bar_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_figure" ADD CONSTRAINT "pages_blocks_figure_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_figure_locales" ADD CONSTRAINT "pages_blocks_figure_locales_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_figure_locales" ADD CONSTRAINT "pages_blocks_figure_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_figure"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form_hints" ADD CONSTRAINT "pages_blocks_contact_form_hints_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form_hints_locales" ADD CONSTRAINT "pages_blocks_contact_form_hints_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_form_hints"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form_request_type_options" ADD CONSTRAINT "pages_blocks_contact_form_request_type_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form_request_type_options_locales" ADD CONSTRAINT "pages_blocks_contact_form_request_type_options_locales_pa_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_form_request_type_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form_urgency_options" ADD CONSTRAINT "pages_blocks_contact_form_urgency_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form_urgency_options_locales" ADD CONSTRAINT "pages_blocks_contact_form_urgency_options_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_form_urgency_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form" ADD CONSTRAINT "pages_blocks_contact_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_form_locales" ADD CONSTRAINT "pages_blocks_contact_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_editions" ADD CONSTRAINT "pages_blocks_vmware_calculator_editions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_editions_locales" ADD CONSTRAINT "pages_blocks_vmware_calculator_editions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator_editions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_tiers" ADD CONSTRAINT "pages_blocks_vmware_calculator_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_tiers_locales" ADD CONSTRAINT "pages_blocks_vmware_calculator_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_months" ADD CONSTRAINT "pages_blocks_vmware_calculator_months_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_months_locales" ADD CONSTRAINT "pages_blocks_vmware_calculator_months_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator_months"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_features" ADD CONSTRAINT "pages_blocks_vmware_calculator_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_features_locales" ADD CONSTRAINT "pages_blocks_vmware_calculator_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator" ADD CONSTRAINT "pages_blocks_vmware_calculator_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_vmware_calculator_locales" ADD CONSTRAINT "pages_blocks_vmware_calculator_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_trust_points" ADD CONSTRAINT "_pages_v_blocks_hero_trust_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_trust_points_locales" ADD CONSTRAINT "_pages_v_blocks_hero_trust_points_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_trust_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_buttons" ADD CONSTRAINT "_pages_v_blocks_hero_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_hero_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_text_buttons" ADD CONSTRAINT "_pages_v_blocks_text_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_text_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_text_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_text_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_text" ADD CONSTRAINT "_pages_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_text_locales" ADD CONSTRAINT "_pages_v_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_cards_chips" ADD CONSTRAINT "_pages_v_blocks_cards_cards_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_cards_chips_locales" ADD CONSTRAINT "_pages_v_blocks_cards_cards_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards_cards_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_cards_buttons" ADD CONSTRAINT "_pages_v_blocks_cards_cards_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_cards_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_cards_cards_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards_cards_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_cards" ADD CONSTRAINT "_pages_v_blocks_cards_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_cards_locales" ADD CONSTRAINT "_pages_v_blocks_cards_cards_locales_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_cards_locales" ADD CONSTRAINT "_pages_v_blocks_cards_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards" ADD CONSTRAINT "_pages_v_blocks_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards_locales" ADD CONSTRAINT "_pages_v_blocks_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps_steps" ADD CONSTRAINT "_pages_v_blocks_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps_steps_locales" ADD CONSTRAINT "_pages_v_blocks_steps_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_steps_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps" ADD CONSTRAINT "_pages_v_blocks_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps_locales" ADD CONSTRAINT "_pages_v_blocks_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" ADD CONSTRAINT "_pages_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_bar_buttons" ADD CONSTRAINT "_pages_v_blocks_cta_bar_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_bar_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_cta_bar_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta_bar_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_bar" ADD CONSTRAINT "_pages_v_blocks_cta_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_bar_locales" ADD CONSTRAINT "_pages_v_blocks_cta_bar_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_figure" ADD CONSTRAINT "_pages_v_blocks_figure_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_figure_locales" ADD CONSTRAINT "_pages_v_blocks_figure_locales_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_figure_locales" ADD CONSTRAINT "_pages_v_blocks_figure_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_figure"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form_hints" ADD CONSTRAINT "_pages_v_blocks_contact_form_hints_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form_hints_locales" ADD CONSTRAINT "_pages_v_blocks_contact_form_hints_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_form_hints"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form_request_type_options" ADD CONSTRAINT "_pages_v_blocks_contact_form_request_type_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form_request_type_options_locales" ADD CONSTRAINT "_pages_v_blocks_contact_form_request_type_options_locales_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_form_request_type_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form_urgency_options" ADD CONSTRAINT "_pages_v_blocks_contact_form_urgency_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form_urgency_options_locales" ADD CONSTRAINT "_pages_v_blocks_contact_form_urgency_options_locales_pare_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_form_urgency_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form" ADD CONSTRAINT "_pages_v_blocks_contact_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_form_locales" ADD CONSTRAINT "_pages_v_blocks_contact_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_contact_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_editions" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_editions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_editions_locales" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_editions_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator_editions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_tiers" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_tiers_locales" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_months" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_months_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_months_locales" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_months_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator_months"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_features" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_features_locales" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_features_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_vmware_calculator_locales" ADD CONSTRAINT "_pages_v_blocks_vmware_calculator_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_vmware_calculator"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "chrome_nav_items" ADD CONSTRAINT "chrome_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."chrome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "chrome_footer_legal" ADD CONSTRAINT "chrome_footer_legal_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."chrome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "chrome_subnav_tabs" ADD CONSTRAINT "chrome_subnav_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."chrome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "chrome_locales" ADD CONSTRAINT "chrome_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."chrome"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "media_public_path_idx" ON "media" USING btree ("public_path");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_sm_sizes_sm_filename_idx" ON "media" USING btree ("sizes_sm_filename");
  CREATE INDEX "media_sizes_md_sizes_md_filename_idx" ON "media" USING btree ("sizes_md_filename");
  CREATE INDEX "media_sizes_lg_sizes_lg_filename_idx" ON "media" USING btree ("sizes_lg_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_trust_points_order_idx" ON "pages_blocks_hero_trust_points" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_trust_points_parent_id_idx" ON "pages_blocks_hero_trust_points" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_trust_points_locales_locale_parent_id_uniq" ON "pages_blocks_hero_trust_points_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_trust_points_locales_parent_id_idx" ON "pages_blocks_hero_trust_points_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_buttons_order_idx" ON "pages_blocks_hero_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_buttons_parent_id_idx" ON "pages_blocks_hero_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_buttons_locales_locale_parent_id_unique" ON "pages_blocks_hero_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_buttons_locales_parent_id_idx" ON "pages_blocks_hero_buttons_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_photo_idx" ON "pages_blocks_hero_locales" USING btree ("photo_id","_locale");
  CREATE UNIQUE INDEX "pages_blocks_hero_locales_locale_parent_id_unique" ON "pages_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_locales_parent_id_idx" ON "pages_blocks_hero_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_text_buttons_order_idx" ON "pages_blocks_text_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_text_buttons_parent_id_idx" ON "pages_blocks_text_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_text_buttons_locales_locale_parent_id_unique" ON "pages_blocks_text_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_text_buttons_locales_parent_id_idx" ON "pages_blocks_text_buttons_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_text_order_idx" ON "pages_blocks_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_text_parent_id_idx" ON "pages_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_text_path_idx" ON "pages_blocks_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_text_locales_locale_parent_id_unique" ON "pages_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_text_locales_parent_id_idx" ON "pages_blocks_text_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_cards_chips_order_idx" ON "pages_blocks_cards_cards_chips" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_cards_chips_parent_id_idx" ON "pages_blocks_cards_cards_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_cards_cards_chips_locales_locale_parent_id_uniq" ON "pages_blocks_cards_cards_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cards_cards_chips_locales_parent_id_idx" ON "pages_blocks_cards_cards_chips_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_cards_buttons_order_idx" ON "pages_blocks_cards_cards_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_cards_buttons_parent_id_idx" ON "pages_blocks_cards_cards_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_cards_cards_buttons_locales_locale_parent_id_un" ON "pages_blocks_cards_cards_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cards_cards_buttons_locales_parent_id_idx" ON "pages_blocks_cards_cards_buttons_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_cards_order_idx" ON "pages_blocks_cards_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_cards_parent_id_idx" ON "pages_blocks_cards_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_cards_image_idx" ON "pages_blocks_cards_cards_locales" USING btree ("image_id","_locale");
  CREATE UNIQUE INDEX "pages_blocks_cards_cards_locales_locale_parent_id_unique" ON "pages_blocks_cards_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cards_cards_locales_parent_id_idx" ON "pages_blocks_cards_cards_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_order_idx" ON "pages_blocks_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards_parent_id_idx" ON "pages_blocks_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards_path_idx" ON "pages_blocks_cards" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_cards_locales_locale_parent_id_unique" ON "pages_blocks_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cards_locales_parent_id_idx" ON "pages_blocks_cards_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_steps_steps_order_idx" ON "pages_blocks_steps_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_steps_steps_parent_id_idx" ON "pages_blocks_steps_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_steps_steps_locales_locale_parent_id_unique" ON "pages_blocks_steps_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_steps_steps_locales_parent_id_idx" ON "pages_blocks_steps_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_steps_order_idx" ON "pages_blocks_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_steps_parent_id_idx" ON "pages_blocks_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_steps_path_idx" ON "pages_blocks_steps" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_steps_locales_locale_parent_id_unique" ON "pages_blocks_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_steps_locales_parent_id_idx" ON "pages_blocks_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_faq_items_locales_locale_parent_id_unique" ON "pages_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_items_locales_parent_id_idx" ON "pages_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_locales_parent_id_idx" ON "pages_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_bar_buttons_order_idx" ON "pages_blocks_cta_bar_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_bar_buttons_parent_id_idx" ON "pages_blocks_cta_bar_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_cta_bar_buttons_locales_locale_parent_id_unique" ON "pages_blocks_cta_bar_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cta_bar_buttons_locales_parent_id_idx" ON "pages_blocks_cta_bar_buttons_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_bar_order_idx" ON "pages_blocks_cta_bar" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_bar_parent_id_idx" ON "pages_blocks_cta_bar" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_bar_path_idx" ON "pages_blocks_cta_bar" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_cta_bar_locales_locale_parent_id_unique" ON "pages_blocks_cta_bar_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cta_bar_locales_parent_id_idx" ON "pages_blocks_cta_bar_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_figure_order_idx" ON "pages_blocks_figure" USING btree ("_order");
  CREATE INDEX "pages_blocks_figure_parent_id_idx" ON "pages_blocks_figure" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_figure_path_idx" ON "pages_blocks_figure" USING btree ("_path");
  CREATE INDEX "pages_blocks_figure_image_idx" ON "pages_blocks_figure_locales" USING btree ("image_id","_locale");
  CREATE UNIQUE INDEX "pages_blocks_figure_locales_locale_parent_id_unique" ON "pages_blocks_figure_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_figure_locales_parent_id_idx" ON "pages_blocks_figure_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_form_hints_order_idx" ON "pages_blocks_contact_form_hints" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_form_hints_parent_id_idx" ON "pages_blocks_contact_form_hints" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_contact_form_hints_locales_locale_parent_id_uni" ON "pages_blocks_contact_form_hints_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_contact_form_hints_locales_parent_id_idx" ON "pages_blocks_contact_form_hints_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_form_request_type_options_order_idx" ON "pages_blocks_contact_form_request_type_options" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_form_request_type_options_parent_id_idx" ON "pages_blocks_contact_form_request_type_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_contact_form_request_type_options_locales_local" ON "pages_blocks_contact_form_request_type_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_contact_form_request_type_options_locales_p_idx" ON "pages_blocks_contact_form_request_type_options_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_form_urgency_options_order_idx" ON "pages_blocks_contact_form_urgency_options" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_form_urgency_options_parent_id_idx" ON "pages_blocks_contact_form_urgency_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_contact_form_urgency_options_locales_locale_par" ON "pages_blocks_contact_form_urgency_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_contact_form_urgency_options_locales_parent_idx" ON "pages_blocks_contact_form_urgency_options_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_form_order_idx" ON "pages_blocks_contact_form" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_form_parent_id_idx" ON "pages_blocks_contact_form" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_form_path_idx" ON "pages_blocks_contact_form" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_contact_form_locales_locale_parent_id_unique" ON "pages_blocks_contact_form_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_contact_form_locales_parent_id_idx" ON "pages_blocks_contact_form_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_editions_order_idx" ON "pages_blocks_vmware_calculator_editions" USING btree ("_order");
  CREATE INDEX "pages_blocks_vmware_calculator_editions_parent_id_idx" ON "pages_blocks_vmware_calculator_editions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_vmware_calculator_editions_locales_locale_paren" ON "pages_blocks_vmware_calculator_editions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_editions_locales_parent_i_idx" ON "pages_blocks_vmware_calculator_editions_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_tiers_order_idx" ON "pages_blocks_vmware_calculator_tiers" USING btree ("_order");
  CREATE INDEX "pages_blocks_vmware_calculator_tiers_parent_id_idx" ON "pages_blocks_vmware_calculator_tiers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_vmware_calculator_tiers_locales_locale_parent_i" ON "pages_blocks_vmware_calculator_tiers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_tiers_locales_parent_id_idx" ON "pages_blocks_vmware_calculator_tiers_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_months_order_idx" ON "pages_blocks_vmware_calculator_months" USING btree ("_order");
  CREATE INDEX "pages_blocks_vmware_calculator_months_parent_id_idx" ON "pages_blocks_vmware_calculator_months" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_vmware_calculator_months_locales_locale_parent_" ON "pages_blocks_vmware_calculator_months_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_months_locales_parent_id_idx" ON "pages_blocks_vmware_calculator_months_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_features_order_idx" ON "pages_blocks_vmware_calculator_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_vmware_calculator_features_parent_id_idx" ON "pages_blocks_vmware_calculator_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_vmware_calculator_features_locales_locale_paren" ON "pages_blocks_vmware_calculator_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_features_locales_parent_i_idx" ON "pages_blocks_vmware_calculator_features_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_order_idx" ON "pages_blocks_vmware_calculator" USING btree ("_order");
  CREATE INDEX "pages_blocks_vmware_calculator_parent_id_idx" ON "pages_blocks_vmware_calculator" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_path_idx" ON "pages_blocks_vmware_calculator" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_vmware_calculator_locales_locale_parent_id_uniq" ON "pages_blocks_vmware_calculator_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_vmware_calculator_locales_parent_id_idx" ON "pages_blocks_vmware_calculator_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE UNIQUE INDEX "pages_translation_key_idx" ON "pages" USING btree ("translation_key");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_locales_parent_id_idx" ON "pages_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_trust_points_order_idx" ON "_pages_v_blocks_hero_trust_points" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_trust_points_parent_id_idx" ON "_pages_v_blocks_hero_trust_points" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_trust_points_locales_locale_parent_id_u" ON "_pages_v_blocks_hero_trust_points_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_trust_points_locales_parent_id_idx" ON "_pages_v_blocks_hero_trust_points_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_buttons_order_idx" ON "_pages_v_blocks_hero_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_buttons_parent_id_idx" ON "_pages_v_blocks_hero_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_buttons_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_buttons_locales_parent_id_idx" ON "_pages_v_blocks_hero_buttons_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_photo_idx" ON "_pages_v_blocks_hero_locales" USING btree ("photo_id","_locale");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_locales_parent_id_idx" ON "_pages_v_blocks_hero_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_text_buttons_order_idx" ON "_pages_v_blocks_text_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_text_buttons_parent_id_idx" ON "_pages_v_blocks_text_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_text_buttons_locales_locale_parent_id_unique" ON "_pages_v_blocks_text_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_text_buttons_locales_parent_id_idx" ON "_pages_v_blocks_text_buttons_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_text_order_idx" ON "_pages_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_text_parent_id_idx" ON "_pages_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_text_path_idx" ON "_pages_v_blocks_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_text_locales_parent_id_idx" ON "_pages_v_blocks_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_cards_chips_order_idx" ON "_pages_v_blocks_cards_cards_chips" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_cards_chips_parent_id_idx" ON "_pages_v_blocks_cards_cards_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_cards_cards_chips_locales_locale_parent_id_u" ON "_pages_v_blocks_cards_cards_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_cards_chips_locales_parent_id_idx" ON "_pages_v_blocks_cards_cards_chips_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_cards_buttons_order_idx" ON "_pages_v_blocks_cards_cards_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_cards_buttons_parent_id_idx" ON "_pages_v_blocks_cards_cards_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_cards_cards_buttons_locales_locale_parent_id" ON "_pages_v_blocks_cards_cards_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_cards_buttons_locales_parent_id_idx" ON "_pages_v_blocks_cards_cards_buttons_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_cards_order_idx" ON "_pages_v_blocks_cards_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_cards_parent_id_idx" ON "_pages_v_blocks_cards_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_cards_image_idx" ON "_pages_v_blocks_cards_cards_locales" USING btree ("image_id","_locale");
  CREATE UNIQUE INDEX "_pages_v_blocks_cards_cards_locales_locale_parent_id_unique" ON "_pages_v_blocks_cards_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_cards_locales_parent_id_idx" ON "_pages_v_blocks_cards_cards_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_order_idx" ON "_pages_v_blocks_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards_parent_id_idx" ON "_pages_v_blocks_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_path_idx" ON "_pages_v_blocks_cards" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_cards_locales_locale_parent_id_unique" ON "_pages_v_blocks_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cards_locales_parent_id_idx" ON "_pages_v_blocks_cards_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_steps_order_idx" ON "_pages_v_blocks_steps_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_steps_steps_parent_id_idx" ON "_pages_v_blocks_steps_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_steps_steps_locales_locale_parent_id_unique" ON "_pages_v_blocks_steps_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_steps_locales_parent_id_idx" ON "_pages_v_blocks_steps_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_order_idx" ON "_pages_v_blocks_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_steps_parent_id_idx" ON "_pages_v_blocks_steps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_path_idx" ON "_pages_v_blocks_steps" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_steps_locales_locale_parent_id_unique" ON "_pages_v_blocks_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_locales_parent_id_idx" ON "_pages_v_blocks_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_locales_parent_id_idx" ON "_pages_v_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_locales_parent_id_idx" ON "_pages_v_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_bar_buttons_order_idx" ON "_pages_v_blocks_cta_bar_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_bar_buttons_parent_id_idx" ON "_pages_v_blocks_cta_bar_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_cta_bar_buttons_locales_locale_parent_id_uni" ON "_pages_v_blocks_cta_bar_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_bar_buttons_locales_parent_id_idx" ON "_pages_v_blocks_cta_bar_buttons_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_bar_order_idx" ON "_pages_v_blocks_cta_bar" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_bar_parent_id_idx" ON "_pages_v_blocks_cta_bar" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_bar_path_idx" ON "_pages_v_blocks_cta_bar" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_cta_bar_locales_locale_parent_id_unique" ON "_pages_v_blocks_cta_bar_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_bar_locales_parent_id_idx" ON "_pages_v_blocks_cta_bar_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_figure_order_idx" ON "_pages_v_blocks_figure" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_figure_parent_id_idx" ON "_pages_v_blocks_figure" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_figure_path_idx" ON "_pages_v_blocks_figure" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_figure_image_idx" ON "_pages_v_blocks_figure_locales" USING btree ("image_id","_locale");
  CREATE UNIQUE INDEX "_pages_v_blocks_figure_locales_locale_parent_id_unique" ON "_pages_v_blocks_figure_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_figure_locales_parent_id_idx" ON "_pages_v_blocks_figure_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_hints_order_idx" ON "_pages_v_blocks_contact_form_hints" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_form_hints_parent_id_idx" ON "_pages_v_blocks_contact_form_hints" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_contact_form_hints_locales_locale_parent_id_" ON "_pages_v_blocks_contact_form_hints_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_hints_locales_parent_id_idx" ON "_pages_v_blocks_contact_form_hints_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_request_type_options_order_idx" ON "_pages_v_blocks_contact_form_request_type_options" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_form_request_type_options_parent_id_idx" ON "_pages_v_blocks_contact_form_request_type_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_contact_form_request_type_options_locales_lo" ON "_pages_v_blocks_contact_form_request_type_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_request_type_options_locale_idx" ON "_pages_v_blocks_contact_form_request_type_options_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_urgency_options_order_idx" ON "_pages_v_blocks_contact_form_urgency_options" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_form_urgency_options_parent_id_idx" ON "_pages_v_blocks_contact_form_urgency_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_contact_form_urgency_options_locales_locale_" ON "_pages_v_blocks_contact_form_urgency_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_urgency_options_locales_par_idx" ON "_pages_v_blocks_contact_form_urgency_options_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_order_idx" ON "_pages_v_blocks_contact_form" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_form_parent_id_idx" ON "_pages_v_blocks_contact_form" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_path_idx" ON "_pages_v_blocks_contact_form" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_contact_form_locales_locale_parent_id_unique" ON "_pages_v_blocks_contact_form_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_form_locales_parent_id_idx" ON "_pages_v_blocks_contact_form_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_editions_order_idx" ON "_pages_v_blocks_vmware_calculator_editions" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_editions_parent_id_idx" ON "_pages_v_blocks_vmware_calculator_editions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_vmware_calculator_editions_locales_locale_pa" ON "_pages_v_blocks_vmware_calculator_editions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_editions_locales_paren_idx" ON "_pages_v_blocks_vmware_calculator_editions_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_tiers_order_idx" ON "_pages_v_blocks_vmware_calculator_tiers" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_tiers_parent_id_idx" ON "_pages_v_blocks_vmware_calculator_tiers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_vmware_calculator_tiers_locales_locale_paren" ON "_pages_v_blocks_vmware_calculator_tiers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_tiers_locales_parent_i_idx" ON "_pages_v_blocks_vmware_calculator_tiers_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_months_order_idx" ON "_pages_v_blocks_vmware_calculator_months" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_months_parent_id_idx" ON "_pages_v_blocks_vmware_calculator_months" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_vmware_calculator_months_locales_locale_pare" ON "_pages_v_blocks_vmware_calculator_months_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_months_locales_parent__idx" ON "_pages_v_blocks_vmware_calculator_months_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_features_order_idx" ON "_pages_v_blocks_vmware_calculator_features" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_features_parent_id_idx" ON "_pages_v_blocks_vmware_calculator_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_vmware_calculator_features_locales_locale_pa" ON "_pages_v_blocks_vmware_calculator_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_features_locales_paren_idx" ON "_pages_v_blocks_vmware_calculator_features_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_order_idx" ON "_pages_v_blocks_vmware_calculator" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_parent_id_idx" ON "_pages_v_blocks_vmware_calculator" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_path_idx" ON "_pages_v_blocks_vmware_calculator" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_vmware_calculator_locales_locale_parent_id_u" ON "_pages_v_blocks_vmware_calculator_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_vmware_calculator_locales_parent_id_idx" ON "_pages_v_blocks_vmware_calculator_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_translation_key_idx" ON "_pages_v" USING btree ("version_translation_key");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_locales_parent_id_idx" ON "_pages_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "chrome_nav_items_order_idx" ON "chrome_nav_items" USING btree ("_order");
  CREATE INDEX "chrome_nav_items_parent_id_idx" ON "chrome_nav_items" USING btree ("_parent_id");
  CREATE INDEX "chrome_nav_items_locale_idx" ON "chrome_nav_items" USING btree ("_locale");
  CREATE INDEX "chrome_footer_legal_order_idx" ON "chrome_footer_legal" USING btree ("_order");
  CREATE INDEX "chrome_footer_legal_parent_id_idx" ON "chrome_footer_legal" USING btree ("_parent_id");
  CREATE INDEX "chrome_footer_legal_locale_idx" ON "chrome_footer_legal" USING btree ("_locale");
  CREATE INDEX "chrome_subnav_tabs_order_idx" ON "chrome_subnav_tabs" USING btree ("_order");
  CREATE INDEX "chrome_subnav_tabs_parent_id_idx" ON "chrome_subnav_tabs" USING btree ("_parent_id");
  CREATE INDEX "chrome_subnav_tabs_locale_idx" ON "chrome_subnav_tabs" USING btree ("_locale");
  CREATE UNIQUE INDEX "chrome_locales_locale_parent_id_unique" ON "chrome_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "chrome_locales_parent_id_idx" ON "chrome_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "pages_blocks_hero_trust_points" CASCADE;
  DROP TABLE "pages_blocks_hero_trust_points_locales" CASCADE;
  DROP TABLE "pages_blocks_hero_buttons" CASCADE;
  DROP TABLE "pages_blocks_hero_buttons_locales" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_hero_locales" CASCADE;
  DROP TABLE "pages_blocks_text_buttons" CASCADE;
  DROP TABLE "pages_blocks_text_buttons_locales" CASCADE;
  DROP TABLE "pages_blocks_text" CASCADE;
  DROP TABLE "pages_blocks_text_locales" CASCADE;
  DROP TABLE "pages_blocks_cards_cards_chips" CASCADE;
  DROP TABLE "pages_blocks_cards_cards_chips_locales" CASCADE;
  DROP TABLE "pages_blocks_cards_cards_buttons" CASCADE;
  DROP TABLE "pages_blocks_cards_cards_buttons_locales" CASCADE;
  DROP TABLE "pages_blocks_cards_cards" CASCADE;
  DROP TABLE "pages_blocks_cards_cards_locales" CASCADE;
  DROP TABLE "pages_blocks_cards" CASCADE;
  DROP TABLE "pages_blocks_cards_locales" CASCADE;
  DROP TABLE "pages_blocks_steps_steps" CASCADE;
  DROP TABLE "pages_blocks_steps_steps_locales" CASCADE;
  DROP TABLE "pages_blocks_steps" CASCADE;
  DROP TABLE "pages_blocks_steps_locales" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq_items_locales" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_faq_locales" CASCADE;
  DROP TABLE "pages_blocks_cta_bar_buttons" CASCADE;
  DROP TABLE "pages_blocks_cta_bar_buttons_locales" CASCADE;
  DROP TABLE "pages_blocks_cta_bar" CASCADE;
  DROP TABLE "pages_blocks_cta_bar_locales" CASCADE;
  DROP TABLE "pages_blocks_figure" CASCADE;
  DROP TABLE "pages_blocks_figure_locales" CASCADE;
  DROP TABLE "pages_blocks_contact_form_hints" CASCADE;
  DROP TABLE "pages_blocks_contact_form_hints_locales" CASCADE;
  DROP TABLE "pages_blocks_contact_form_request_type_options" CASCADE;
  DROP TABLE "pages_blocks_contact_form_request_type_options_locales" CASCADE;
  DROP TABLE "pages_blocks_contact_form_urgency_options" CASCADE;
  DROP TABLE "pages_blocks_contact_form_urgency_options_locales" CASCADE;
  DROP TABLE "pages_blocks_contact_form" CASCADE;
  DROP TABLE "pages_blocks_contact_form_locales" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_editions" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_editions_locales" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_tiers" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_tiers_locales" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_months" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_months_locales" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_features" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_features_locales" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator" CASCADE;
  DROP TABLE "pages_blocks_vmware_calculator_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_trust_points" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_trust_points_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_buttons" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_buttons_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_text_buttons" CASCADE;
  DROP TABLE "_pages_v_blocks_text_buttons_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_text" CASCADE;
  DROP TABLE "_pages_v_blocks_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_cards_chips" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_cards_chips_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_cards_buttons" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_cards_buttons_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_cards_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_cards_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_steps_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_steps_steps_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_steps_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_bar_buttons" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_bar_buttons_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_bar" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_bar_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_figure" CASCADE;
  DROP TABLE "_pages_v_blocks_figure_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form_hints" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form_hints_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form_request_type_options" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form_request_type_options_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form_urgency_options" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form_urgency_options_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_form_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_editions" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_editions_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_tiers" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_tiers_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_months" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_months_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_features" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_features_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator" CASCADE;
  DROP TABLE "_pages_v_blocks_vmware_calculator_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site" CASCADE;
  DROP TABLE "chrome_nav_items" CASCADE;
  DROP TABLE "chrome_footer_legal" CASCADE;
  DROP TABLE "chrome_subnav_tabs" CASCADE;
  DROP TABLE "chrome" CASCADE;
  DROP TABLE "chrome_locales" CASCADE;
  DROP TABLE "publish_status" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_pages_blocks_hero_buttons_style";
  DROP TYPE "public"."enum_pages_blocks_hero_variant";
  DROP TYPE "public"."enum_pages_blocks_hero_note_class";
  DROP TYPE "public"."enum_pages_blocks_text_buttons_style";
  DROP TYPE "public"."enum_pages_blocks_text_variant";
  DROP TYPE "public"."enum_pages_blocks_text_heading_level";
  DROP TYPE "public"."enum_pages_blocks_text_list_class";
  DROP TYPE "public"."enum_pages_blocks_text_note_class";
  DROP TYPE "public"."enum_pages_blocks_cards_cards_buttons_style";
  DROP TYPE "public"."enum_pages_blocks_cards_cards_icon";
  DROP TYPE "public"."enum_pages_blocks_cards_cards_accent";
  DROP TYPE "public"."enum_pages_blocks_cards_variant";
  DROP TYPE "public"."enum_pages_blocks_cards_note_class";
  DROP TYPE "public"."enum_pages_blocks_steps_variant";
  DROP TYPE "public"."enum_pages_blocks_steps_note_class";
  DROP TYPE "public"."enum_pages_blocks_faq_variant";
  DROP TYPE "public"."enum_pages_blocks_cta_bar_buttons_style";
  DROP TYPE "public"."enum_pages_blocks_cta_bar_variant";
  DROP TYPE "public"."enum_pages_blocks_figure_variant";
  DROP TYPE "public"."enum_pages_blocks_figure_note_class";
  DROP TYPE "public"."enum_pages_blocks_contact_form_variant";
  DROP TYPE "public"."enum_pages_blocks_contact_form_note_class";
  DROP TYPE "public"."enum_pages_blocks_vmware_calculator_variant";
  DROP TYPE "public"."enum_pages_structured_data";
  DROP TYPE "public"."enum_pages_frame";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_hero_buttons_style";
  DROP TYPE "public"."enum__pages_v_blocks_hero_variant";
  DROP TYPE "public"."enum__pages_v_blocks_hero_note_class";
  DROP TYPE "public"."enum__pages_v_blocks_text_buttons_style";
  DROP TYPE "public"."enum__pages_v_blocks_text_variant";
  DROP TYPE "public"."enum__pages_v_blocks_text_heading_level";
  DROP TYPE "public"."enum__pages_v_blocks_text_list_class";
  DROP TYPE "public"."enum__pages_v_blocks_text_note_class";
  DROP TYPE "public"."enum__pages_v_blocks_cards_cards_buttons_style";
  DROP TYPE "public"."enum__pages_v_blocks_cards_cards_icon";
  DROP TYPE "public"."enum__pages_v_blocks_cards_cards_accent";
  DROP TYPE "public"."enum__pages_v_blocks_cards_variant";
  DROP TYPE "public"."enum__pages_v_blocks_cards_note_class";
  DROP TYPE "public"."enum__pages_v_blocks_steps_variant";
  DROP TYPE "public"."enum__pages_v_blocks_steps_note_class";
  DROP TYPE "public"."enum__pages_v_blocks_faq_variant";
  DROP TYPE "public"."enum__pages_v_blocks_cta_bar_buttons_style";
  DROP TYPE "public"."enum__pages_v_blocks_cta_bar_variant";
  DROP TYPE "public"."enum__pages_v_blocks_figure_variant";
  DROP TYPE "public"."enum__pages_v_blocks_figure_note_class";
  DROP TYPE "public"."enum__pages_v_blocks_contact_form_variant";
  DROP TYPE "public"."enum__pages_v_blocks_contact_form_note_class";
  DROP TYPE "public"."enum__pages_v_blocks_vmware_calculator_variant";
  DROP TYPE "public"."enum__pages_v_version_structured_data";
  DROP TYPE "public"."enum__pages_v_version_frame";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_publish_status_state";
  DROP TYPE "public"."enum_publish_status_action";`)
}
