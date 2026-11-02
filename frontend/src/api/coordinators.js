import api from './axios';

export const listCoordinatorsApi = async () => {
  const response = await api.get('/coordinators');
  return response.data;
};

export const createCoordinatorApi = async (data) => {
  const response = await api.post('/coordinators', data);
  return response.data;
};

export const updateCoordinatorApi = async (id, data) => {
  const response = await api.put(`/coordinators/${id}`, data);
  return response.data;
};

export const deleteCoordinatorApi = async (id) => {
  const response = await api.delete(`/coordinators/${id}`);
  return response.data;
};
