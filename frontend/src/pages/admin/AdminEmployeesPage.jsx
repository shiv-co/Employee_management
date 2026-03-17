import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2, FiUserPlus } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import PageCard from '../../components/PageCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const initialFormState = {
  name: '',
  email: '',
  password: '',
  role: 'employee',
  department: '',
  designation: '',
  mobileNumber: '',
  dob: ''
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/v1/employees');
      setEmployees(response.data?.data || []);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const heading = useMemo(() => (editingEmployee ? 'Edit Employee' : 'Add Employee'), [editingEmployee]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      password: '',
      role: employee.role || 'employee',
      department: employee.department || '',
      designation: employee.designation || '',
      mobileNumber: employee.mobileNumber || '',
      dob: employee.dob ? new Date(employee.dob).toISOString().slice(0, 10) : ''
    });
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingEmployee) {
        await api.patch(`/v1/employees/${editingEmployee.id}`, {
          name: formData.name,
          role: formData.role,
          department: formData.department,
          designation: formData.designation,
          mobileNumber: formData.mobileNumber,
          dob: formData.dob || null
        });
        toast.success('Employee updated');
      } else {
        await api.post('/v1/employees', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          department: formData.department,
          designation: formData.designation,
          mobileNumber: formData.mobileNumber,
          dob: formData.dob || null
        });
        toast.success('Employee created');
      }

      closeModal();
      await fetchEmployees();
    } catch (apiError) {
      const message = apiError.response?.data?.message || 'Unable to save employee';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(`Delete ${employee.name}? This action cannot be undone.`);
    if (!confirmed) return;

    setError('');
    try {
      await api.delete(`/v1/employees/${employee.id}`);
      toast.success('Employee deleted');
      await fetchEmployees();
    } catch (apiError) {
      const message = apiError.response?.data?.message || 'Delete failed';
      setError(message);
      toast.error(message);
    }
  };

  if (loading) return <LoadingSpinner text="Loading employees..." />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          <FiUserPlus /> Add Employee
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <PageCard>
        <div className="space-y-3 md:hidden">
          {employees.map((employee) => (
            <article key={employee.id} className="rounded-xl border border-slate-200 p-4 text-sm">
              <p className="font-semibold text-slate-900">{employee.name}</p>
              <p className="text-slate-600">{employee.email}</p>
              <p className="text-slate-600">{employee.department || '-'} | {employee.designation || '-'}</p>
              <p className="text-slate-600">Mobile: {employee.mobileNumber || '-'}</p>
              <p className="text-slate-600">DOB: {employee.dob ? new Date(employee.dob).toLocaleDateString() : '-'}</p>
              <p className="capitalize text-slate-600">Role: {employee.role}</p>
              <p className="text-slate-500">Created: {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '-'}</p>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(employee)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100"
                >
                  <FiEdit2 /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(employee)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Department</th>
                <th className="px-2 py-2">Designation</th>
                <th className="px-2 py-2">Mobile</th>
                <th className="px-2 py-2">DOB</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Created Date</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-slate-200">
                  <td className="px-2 py-2 font-medium text-slate-800">{employee.name}</td>
                  <td className="px-2 py-2">{employee.email}</td>
                  <td className="px-2 py-2">{employee.department || '-'}</td>
                  <td className="px-2 py-2">{employee.designation || '-'}</td>
                  <td className="px-2 py-2">{employee.mobileNumber || '-'}</td>
                  <td className="px-2 py-2">{employee.dob ? new Date(employee.dob).toLocaleDateString() : '-'}</td>
                  <td className="px-2 py-2 capitalize">{employee.role}</td>
                  <td className="px-2 py-2">{employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(employee)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        <FiEdit2 /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(employee)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!employees.length ? <p className="px-2 py-3 text-sm text-slate-500">No employees found.</p> : null}
        </div>
      </PageCard>

      {showModal ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/50 bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{heading}</h2>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="text-sm text-slate-700">
                Name
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                Email
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                  disabled={Boolean(editingEmployee)}
                />
              </label>

              {!editingEmployee ? (
                <label className="text-sm text-slate-700">
                  Password
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    required
                  />
                </label>
              ) : null}

              <label className="text-sm text-slate-700">
                Role
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="employee">employee</option>
                  <option value="admin">admin</option>
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Department
                <input
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-slate-700">
                Designation
                <input
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-slate-700">
                Mobile Number
                <input
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Date of Birth
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="mt-2 flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
