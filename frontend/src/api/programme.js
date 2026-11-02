import api from './axios';

// Curriculum Outcomes (PEO, PO, PSO)
export const getCurriculumApi = async (programmeId) => {
  const res = await api.get(`/curriculum?programmeId=${programmeId}`);
  return res.data;
};

export const createPEOApi = async (data) => {
  const res = await api.post('/curriculum/peos', data);
  return res.data;
};

export const updatePEOApi = async (id, data) => {
  const res = await api.put(`/curriculum/peos/${id}`, data);
  return res.data;
};

export const deletePEOApi = async (id) => {
  const res = await api.delete(`/curriculum/peos/${id}`);
  return res.data;
};

export const createPOApi = async (data) => {
  const res = await api.post('/curriculum/pos', data);
  return res.data;
};

export const updatePOApi = async (id, data) => {
  const res = await api.put(`/curriculum/pos/${id}`, data);
  return res.data;
};

export const deletePOApi = async (id) => {
  const res = await api.delete(`/curriculum/pos/${id}`);
  return res.data;
};

export const createPSOApi = async (data) => {
  const res = await api.post('/curriculum/psos', data);
  return res.data;
};

export const updatePSOApi = async (id, data) => {
  const res = await api.put(`/curriculum/psos/${id}`, data);
  return res.data;
};

export const deletePSOApi = async (id) => {
  const res = await api.delete(`/curriculum/psos/${id}`);
  return res.data;
};

// CO-PO & CO-PSO Mapping
export const getMappingMatrixApi = async (courseId) => {
  const res = await api.get(`/mappings/matrix/${courseId}`);
  return res.data;
};

export const saveMappingMatrixApi = async (courseId, data) => {
  const res = await api.post(`/mappings/matrix/${courseId}`, data);
  return res.data;
};

// Programme Attainment & Reports
export const getProgrammeAttainmentApi = async (programmeId, target = 60, academicYear = '') => {
  const params = new URLSearchParams();
  if (target) params.append('target', target);
  if (academicYear) params.append('academicYear', academicYear);
  const res = await api.get(`/programme-attainment/${programmeId}?${params.toString()}`);
  return res.data;
};

export const getCoursePOAttainmentApi = async (courseId, target = 60) => {
  const res = await api.get(`/programme-attainment/course/${courseId}?target=${target}`);
  return res.data;
};

export const exportProgrammeCSVUrl = (programmeId, target = 60, academicYear = '') => {
  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams();
  if (target) params.append('target', target);
  if (academicYear) params.append('academicYear', academicYear);
  return `${baseUrl}/programme-attainment/export-csv/${programmeId}?${params.toString()}`;
};
