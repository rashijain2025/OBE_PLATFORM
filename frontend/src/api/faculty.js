import api from './axios';

// ─── Course Details ──────────────────────────────────────────────────────────

export const getCourseDetailsApi = async (courseId) => {
  const res = await api.get(`/courses/${courseId}/details`);
  return res.data;
};

// ─── Course Outcomes (COs) ────────────────────────────────────────────────────

export const listCOsApi = async (courseId) => {
  const res = await api.get(`/cos?courseId=${courseId}`);
  return res.data;
};

export const createCOApi = async (data) => {
  const res = await api.post('/cos', data);
  return res.data;
};

export const updateCOApi = async (id, data) => {
  const res = await api.put(`/cos/${id}`, data);
  return res.data;
};

export const deleteCOApi = async (id) => {
  const res = await api.delete(`/cos/${id}`);
  return res.data;
};

// ─── Assessments ─────────────────────────────────────────────────────────────

export const listAssessmentsApi = async (courseId) => {
  const res = await api.get(`/assessments?courseId=${courseId}`);
  return res.data;
};

export const getAssessmentApi = async (id) => {
  const res = await api.get(`/assessments/${id}`);
  return res.data;
};

export const createAssessmentApi = async (data) => {
  const res = await api.post('/assessments', data);
  return res.data;
};

export const updateAssessmentApi = async (id, data) => {
  const res = await api.put(`/assessments/${id}`, data);
  return res.data;
};

export const deleteAssessmentApi = async (id) => {
  const res = await api.delete(`/assessments/${id}`);
  return res.data;
};

// ─── Questions & Question→CO Mapping ──────────────────────────────────────────

export const listQuestionsApi = async (assessmentId) => {
  const res = await api.get(`/questions?assessmentId=${assessmentId}`);
  return res.data;
};

export const createQuestionApi = async (data) => {
  const res = await api.post('/questions', data);
  return res.data;
};

export const updateQuestionApi = async (id, data) => {
  const res = await api.put(`/questions/${id}`, data);
  return res.data;
};

export const deleteQuestionApi = async (id) => {
  const res = await api.delete(`/questions/${id}`);
  return res.data;
};

// ─── Marks Management ─────────────────────────────────────────────────────────

export const getMarksGridApi = async (assessmentId) => {
  const res = await api.get(`/marks?assessmentId=${assessmentId}`);
  return res.data;
};

export const saveBulkMarksApi = async (data) => {
  const res = await api.post('/marks/bulk', data);
  return res.data;
};

export const importMarksCSVApi = async (data) => {
  const res = await api.post('/marks/csv-import', data);
  return res.data;
};

// ─── Course Enrollments ───────────────────────────────────────────────────────

export const listCourseEnrollmentsApi = async (courseId) => {
  const res = await api.get(`/enrollments?courseId=${courseId}`);
  return res.data;
};

export const enrollCourseStudentApi = async (data) => {
  const res = await api.post('/enrollments', data);
  return res.data;
};

export const bulkEnrollCourseStudentsApi = async (data) => {
  const res = await api.post('/enrollments/bulk', data);
  return res.data;
};

export const removeCourseEnrollmentApi = async (id) => {
  const res = await api.delete(`/enrollments/${id}`);
  return res.data;
};
