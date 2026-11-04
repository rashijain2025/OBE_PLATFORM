import api from './axios';

// ─── Users ───────────────────────────────────────────────────────────────────

export const listUsersApi = (params = {}) =>
  api.get('/users', { params }).then((r) => r.data);

export const getUserApi = (id) =>
  api.get(`/users/${id}`).then((r) => r.data);

export const updateUserApi = (id, data) =>
  api.put(`/users/${id}`, data).then((r) => r.data);

export const resetPasswordApi = (id, newPassword) =>
  api.patch(`/users/${id}/reset-password`, { newPassword }).then((r) => r.data);

export const deactivateUserApi = (id) =>
  api.patch(`/users/${id}/deactivate`).then((r) => r.data);

export const deleteUserApi = (id) =>
  api.delete(`/users/${id}`).then((r) => r.data);

export const bulkImportStudentsApi = (data) =>
  api.post('/users/bulk-students', data).then((r) => r.data);

// ─── Departments ─────────────────────────────────────────────────────────────

export const listDepartmentsApi = () =>
  api.get('/departments').then((r) => r.data);

export const getSchoolsCatalogApi = () =>
  api.get('/departments/catalog').then((r) => r.data);

export const getDepartmentApi = (id) =>
  api.get(`/departments/${id}`).then((r) => r.data);

export const createDepartmentApi = (data) =>
  api.post('/departments', data).then((r) => r.data);

export const updateDepartmentApi = (id, data) =>
  api.put(`/departments/${id}`, data).then((r) => r.data);

export const deleteDepartmentApi = (id) =>
  api.delete(`/departments/${id}`).then((r) => r.data);

export const getObeTargetsApi = (departmentId) =>
  api.get(`/departments/${departmentId}/obe-targets`).then((r) => r.data);

export const updateObeTargetsApi = (departmentId, data) =>
  api.put(`/departments/${departmentId}/obe-targets`, data).then((r) => r.data);

// ─── Class Lists ─────────────────────────────────────────────────────────────

export const listClassListsApi = () =>
  api.get('/users/class-lists').then((r) => r.data);

export const listClassStudentsApi = (params) =>
  api.get('/users/class-lists/students', { params }).then((r) => r.data);

export const uploadClassListApi = (data) =>
  api.post('/users/class-lists', data).then((r) => r.data);

// ─── Programmes ──────────────────────────────────────────────────────────────

export const listProgrammesApi = () =>
  api.get('/programmes').then((r) => r.data);

export const getProgrammeApi = (id) =>
  api.get(`/programmes/${id}`).then((r) => r.data);

export const createProgrammeApi = (data) =>
  api.post('/programmes', data).then((r) => r.data);

export const updateProgrammeApi = (id, data) =>
  api.put(`/programmes/${id}`, data).then((r) => r.data);

export const deleteProgrammeApi = (id) =>
  api.delete(`/programmes/${id}`).then((r) => r.data);

// ─── Courses ─────────────────────────────────────────────────────────────────

export const listCoursesApi = (params = {}) =>
  api.get('/courses', { params }).then((r) => r.data);

export const getCourseApi = (id) =>
  api.get(`/courses/${id}`).then((r) => r.data);

export const createCourseApi = (data) =>
  api.post('/courses', data).then((r) => r.data);

export const updateCourseApi = (id, data) =>
  api.put(`/courses/${id}`, data).then((r) => r.data);

export const deleteCourseApi = (id) =>
  api.delete(`/courses/${id}`).then((r) => r.data);

// ─── Enrollments ──────────────────────────────────────────────────────────────

export const listEnrollmentsApi = (courseId) =>
  api.get('/enrollments', { params: { courseId } }).then((r) => r.data);

export const enrollStudentApi = (data) =>
  api.post('/enrollments', data).then((r) => r.data);

export const bulkEnrollApi = (data) =>
  api.post('/enrollments/bulk', data).then((r) => r.data);

export const removeEnrollmentApi = (id) =>
  api.delete(`/enrollments/${id}`).then((r) => r.data);

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getDashboardStatsApi = () =>
  api.get('/dashboard').then((r) => r.data);
