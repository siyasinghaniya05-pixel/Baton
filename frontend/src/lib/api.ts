import { UserRole } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("baton_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = options.body instanceof FormData ? {} : this.getAuthHeaders();
    
    // Merge headers if provided
    const headers = {
      ...defaultHeaders,
      ...(options.headers || {}),
    };

    if (options.body instanceof FormData && typeof window !== "undefined") {
      const token = localStorage.getItem("baton_token");
      if (token) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = "API request failed";
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } catch {
        errorDetail = await response.text();
      }
      throw new Error(errorDetail);
    }

    return response.json();
  }

  // Auth Endpoints
  async login(email: string, password: string) {
    const data = await this.request<{
      access_token: string;
      user_id: string;
      email: string;
      full_name: string;
      role: UserRole;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("baton_token", data.access_token);
      localStorage.setItem("baton_user", JSON.stringify(data));
    }
    return data;
  }

  async switchRole(targetRole: UserRole) {
    const data = await this.request<{
      access_token: string;
      user_id: string;
      email: string;
      full_name: string;
      role: UserRole;
    }>(`/auth/switch-demo-role?target_role=${targetRole}`, {
      method: "POST",
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("baton_token", data.access_token);
      localStorage.setItem("baton_user", JSON.stringify(data));
    }
    return data;
  }

  getStoredUser() {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("baton_user");
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("baton_token");
      localStorage.removeItem("baton_user");
    }
  }

  // Analytics
  async getAnalytics() {
    return this.request<any>("/analytics/dashboard");
  }

  // Projects
  async getProjects() {
    return this.request<any[]>("/projects");
  }

  async getProject(id: string) {
    return this.request<any>(`/projects/${id}`);
  }

  async createProject(name: string, description?: string, repositoryUrl?: string) {
    return this.request<any>("/projects", {
      method: "POST",
      body: JSON.stringify({ name, description, repository_url: repositoryUrl }),
    });
  }

  // Sources
  async getSources(projectId: string) {
    return this.request<any[]>(`/sources/project/${projectId}`);
  }

  async uploadSource(formData: FormData) {
    return this.request<any>("/sources/upload", {
      method: "POST",
      body: formData,
    });
  }

  // Claims
  async getClaims(projectId: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/claims/project/${projectId}${query ? `?${query}` : ""}`;
    return this.request<any[]>(endpoint);
  }

  async getClaim(claimId: string) {
    return this.request<any>(`/claims/${claimId}`);
  }

  // Evidence
  async getEvidenceInspection(claimId: string) {
    return this.request<any>(`/evidence/claim/${claimId}`);
  }

  // Gap Interview
  async getGapQuestions(projectId: string) {
    return this.request<any[]>(`/gap-interview/project/${projectId}`);
  }

  async answerGapQuestion(questionId: string, answerText: string) {
    return this.request<any>(`/gap-interview/questions/${questionId}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer_text: answerText }),
    });
  }

  async skipGapQuestion(questionId: string) {
    return this.request<any>(`/gap-interview/questions/${questionId}/skip`, {
      method: "POST",
    });
  }

  async markUnknownGapQuestion(questionId: string) {
    return this.request<any>(`/gap-interview/questions/${questionId}/mark-unknown`, {
      method: "POST",
    });
  }

  // Review
  async reviewClaim(claimId: string, action: string, notes?: string, editedDescription?: string) {
    return this.request<any>(`/review/claim/${claimId}`, {
      method: "POST",
      body: JSON.stringify({
        action,
        reviewer_notes: notes,
        edited_description: editedDescription,
      }),
    });
  }

  async approveHandover(handoverId: string) {
    return this.request<any>(`/review/handover/${handoverId}/approve`, {
      method: "POST",
    });
  }

  // Handovers
  async getHandovers(projectId: string) {
    return this.request<any[]>(`/handovers/project/${projectId}`);
  }

  async getHandoverRoleView(handoverId: string, targetRole?: string) {
    const endpoint = `/handovers/${handoverId}/role-view${targetRole ? `?target_role=${targetRole}` : ""}`;
    return this.request<any>(endpoint);
  }

  async compileHandover(projectId: string, title?: string) {
    return this.request<any>(`/handovers/compile?project_id=${projectId}&title=${encodeURIComponent(title || "New Version")}`, {
      method: "POST",
    });
  }

  async publishHandover(handoverId: string) {
    return this.request<any>(`/handovers/${handoverId}/publish`, {
      method: "POST",
    });
  }

  async acknowledgeHandover(handoverId: string, quizAnswers: number[], comments?: string) {
    return this.request<any>(`/handovers/${handoverId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({
        quiz_answers: quizAnswers,
        successor_comments: comments,
      }),
    });
  }

  // Timeline
  async getTimeline(projectId: string) {
    return this.request<any[]>(`/timeline/project/${projectId}`);
  }

  // Audit
  async getAuditLogs(projectId: string) {
    return this.request<any[]>(`/audit/project/${projectId}`);
  }

  // BATON 2.0 Continuity Intelligence API
  async getReadiness(projectId: string) {
    return this.request<any>(`/projects/${projectId}/readiness`);
  }

  async getRiskRadar(projectId: string) {
    return this.request<any>(`/projects/${projectId}/risks`);
  }

  async updateRiskStatus(projectId: string, riskId: string, status: string) {
    return this.request<any>(`/projects/${projectId}/risks/${riskId}?status=${encodeURIComponent(status)}`, {
      method: "PATCH",
    });
  }

  async getKnowledgeGraph(projectId: string) {
    return this.request<any>(`/projects/${projectId}/graph`);
  }

  async getDecisions(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/decisions`);
  }

  async getDecisionDetail(projectId: string, decisionId: string) {
    return this.request<any>(`/projects/${projectId}/decisions/${decisionId}`);
  }

  async askAssistant(projectId: string, question: string) {
    return this.request<any>(`/projects/${projectId}/assistant/ask`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  }

  async getMissions(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/missions`);
  }

  async updateMission(projectId: string, missionId: string, payload: { status?: string; successor_notes?: string }) {
    return this.request<any>(`/projects/${projectId}/missions/${missionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async getRunbooks(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/runbooks`);
  }

  async verifyRunbook(projectId: string, runbookId: string, isVerified: boolean) {
    return this.request<any>(`/projects/${projectId}/runbooks/${runbookId}/verify`, {
      method: "POST",
      body: JSON.stringify({ is_verified: isVerified }),
    });
  }

  async getBusFactor(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/bus-factor`);
  }

  async getDrift(projectId: string) {
    return this.request<any>(`/projects/${projectId}/drift`);
  }

  async runSecuritySimulation(projectId: string) {
    return this.request<any>(`/projects/${projectId}/security-lab/simulate`, {
      method: "POST",
    });
  }

  async getComments(projectId: string, claimId?: string, runbookId?: string) {
    let url = `/projects/${projectId}/collaboration/comments`;
    const params = [];
    if (claimId) params.push(`claim_id=${claimId}`);
    if (runbookId) params.push(`runbook_id=${runbookId}`);
    if (params.length > 0) url += `?${params.join("&")}`;
    return this.request<any[]>(url);
  }

  async postComment(projectId: string, payload: { claim_id?: string; runbook_id?: string; comment_text: string; status_tag?: string }) {
    return this.request<any>(`/projects/${projectId}/collaboration/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Reset demo
  async resetDemo() {
    return this.request<any>("/seed/reset", {
      method: "POST",
    });
  }
}

export const api = new ApiClient();

