export type UserRole = "admin" | "leaver" | "reviewer" | "successor" | "restricted_viewer";
export type SensitivityLevel = "public" | "internal" | "confidential" | "restricted";
export type ClaimStatus = "Verified" | "Evidence-backed" | "Inferred" | "Conflict" | "Missing" | "Unverified";
export type ClaimCategory = 
  | "Decision"
  | "Decision Reasoning"
  | "Task Ownership"
  | "Pending Task"
  | "Dependency"
  | "Blocker"
  | "Risk"
  | "Recurring Problem"
  | "Important Contact"
  | "Deployment & Access"
  | "Timeline Milestone"
  | "Open Question";

export type ReviewState = "pending" | "accepted" | "edited" | "rejected";
export type HandoverStatus = "draft" | "under_review" | "approved" | "published" | "archived";
export type Timeframe = "Day 1" | "Week 1" | "Day 30";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  repository_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  total_sources: number;
  total_claims: number;
  total_handovers: number;
}

export interface Source {
  id: string;
  project_id: string;
  filename: string;
  file_type: "repo" | "markdown" | "pdf" | "csv" | "json" | "chat";
  sensitivity: SensitivityLevel;
  consent_confirmed: boolean;
  sha256_hash?: string;
  source_metadata: Record<string, any>;
  created_at: string;
  total_chunks: number;
}

export interface EvidenceSpan {
  id: string;
  chunk_id: string;
  quote: string;
  char_start?: number;
  char_end?: number;
  verified_deterministic: boolean;
  semantic_support_score: number;
}

export interface Claim {
  id: string;
  project_id: string;
  category: ClaimCategory;
  description: string;
  reasoning?: string;
  exact_quote?: string;
  source_id?: string;
  chunk_id?: string;
  evidence_location?: string;
  confidence: number;
  status: ClaimStatus;
  sensitivity: SensitivityLevel;
  review_state: ReviewState;
  reviewer_notes?: string;
  conflict_claim_id?: string;
  event_timestamp?: string;
  created_at: string;
  updated_at: string;
  evidence_spans: EvidenceSpan[];
}

export interface GapQuestion {
  id: string;
  project_id: string;
  question_text: string;
  context_category: string;
  detected_gap_type: string;
  priority: number;
  status: "pending" | "answered" | "skipped" | "marked_unknown";
  target_role: string;
  linked_claim_id?: string;
  created_at: string;
  answers: {
    id: string;
    question_id: string;
    answered_by: string;
    answer_text: string;
    created_at: string;
  }[];
}

export interface ContinuationAction {
  id: string;
  timeframe: Timeframe;
  title: string;
  description: string;
  assigned_to?: string;
  linked_claim_id?: string;
  priority: string;
  is_verified: boolean;
}

export interface ComprehensionCheck {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

export interface HandoverVersion {
  id: string;
  project_id: string;
  version_number: number;
  title: string;
  executive_summary: string;
  status: HandoverStatus;
  approved_by?: string;
  approved_at?: string;
  published_share_token?: string;
  share_expires_at?: string;
  created_at: string;
  actions: ContinuationAction[];
  comprehension_checks: ComprehensionCheck[];
}

export interface AuditLog {
  id: string;
  project_id?: string;
  user_id?: string;
  user_email: string;
  user_name: string;
  action: string;
  target_type: string;
  target_id?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface AnalyticsData {
  total_projects: number;
  active_handovers: number;
  pending_reviews: number;
  approved_handovers: number;
  missing_information: number;
  conflicting_claims: number;
  verified_claims: number;
  evidence_backed_claims: number;
  inferred_claims: number;
  total_sources: number;
  category_distribution: Record<string, number>;
  sensitivity_distribution: Record<string, number>;
  recent_activity: {
    id: string;
    action: string;
    target: string;
    user: string;
    time: string;
    details: Record<string, any>;
  }[];
}

