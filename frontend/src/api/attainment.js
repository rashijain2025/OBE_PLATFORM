import api from './axios';

export const getCourseCOAttainmentApi = async (courseId, target = 40) => {
  const res = await api.get(`/attainment?courseId=${courseId}&target=${target}`);
  return res.data;
};

export const getFacultyReportApi = async (courseId, target = 40) => {
  const res = await api.get(`/attainment/report?courseId=${courseId}&target=${target}`);
  return res.data;
};

export const exportAttainmentCSVUrl = (courseId, target = 40) => {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return `${baseURL}/attainment/export?courseId=${courseId}&target=${target}`;
};
