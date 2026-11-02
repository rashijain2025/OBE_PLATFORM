import api from './axios';

export const listInvitationsApi = async () => {
  const response = await api.get('/invitations');
  return response.data;
};

export const sendInvitationsApi = async (emails) => {
  const response = await api.post('/invitations', { emails });
  return response.data;
};

export const resendInvitationApi = async (id) => {
  const response = await api.post(`/invitations/${id}/resend`);
  return response.data;
};

export const revokeInvitationApi = async (id) => {
  const response = await api.delete(`/invitations/${id}`);
  return response.data;
};

export const listFacultyApi = async () => {
  const response = await api.get('/faculty');
  return response.data;
};

export const assignFacultyCoursesApi = async (facultyId, courseIds) => {
  const response = await api.post(`/faculty/${facultyId}/assign-courses`, { courseIds });
  return response.data;
};
