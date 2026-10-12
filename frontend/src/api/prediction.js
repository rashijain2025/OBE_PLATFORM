import api from './axios';

export const getCoursePredictionsApi = async (courseId, target = 40) => {
  const res = await api.get(`/courses/${courseId}/predictions?target=${target}`);
  return res.data;
};

export const getModelInfoApi = async () => {
  const res = await api.get('/ml/model-info');
  return res.data;
};

export const trainModelApi = async () => {
  const res = await api.post('/ml/train');
  return res.data;
};
