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
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const token = localStorage.getItem('token');
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return `${baseURL}/attainment/export?courseId=${courseId}&target=${target}${tokenParam}`;
};

export const downloadAttainmentCSV = async (courseId, target = 40, courseCode = 'Course') => {
  const res = await api.get(`/attainment/export?courseId=${courseId}&target=${target}`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${courseCode}_Attainment_Report.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
