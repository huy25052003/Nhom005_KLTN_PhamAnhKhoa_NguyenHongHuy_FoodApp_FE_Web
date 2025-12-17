import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, getUserDetails, updateUserRoles, deleteUser } from "../../api/adminUsers.js";
import ConfirmModal from "../../component/ConfirmModal";

const ALL_ROLES = ["ROLE_USER", "ROLE_ADMIN", "ROLE_KITCHEN", "ROLE_SHIPPER", "ROLE_LOCKED"];

export default function AdminUsersPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);

    // State cho Confirm Modal (Thay thế window.confirm)
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        userId: null,
        username: null
    });

    const { data: usersPage, isLoading, isError, error } = useQuery({
        queryKey: ["adminUsers", page, size],
        queryFn: () => listUsers(page, size),
        placeholderData: (prevData) => prevData, 
    });

    const [editingUser, setEditingUser] = useState(null); 
    const [selectedRoles, setSelectedRoles] = useState(new Set());

    const updateRolesMutation = useMutation({
        mutationFn: ({ id, roles }) => updateUserRoles(id, roles),
        onSuccess: () => {
            alert("Cập nhật trạng thái thành công!");
            setEditingUser(null);
            // Đóng modal confirm nếu đang mở (trường hợp xử lý khóa)
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        },
        onError: (err) => {
            alert(`Lỗi cập nhật: ${err?.response?.data?.message || err.message}`);
        },
    });

    const handleEditRoles = (user) => {
        setEditingUser(user);
        setSelectedRoles(new Set(user.roles || []));
    };

    const handleRoleChange = (role, isChecked) => {
        setSelectedRoles(prev => {
            const next = new Set(prev);
            if (isChecked) {
                next.add(role);
            } else {
                next.delete(role);
            }
            return next;
        });
    };

    const handleSaveRoles = () => {
        if (!editingUser) return;
        if (selectedRoles.size === 0) {
            alert("Người dùng phải có ít nhất một vai trò.");
            return;
        }
        updateRolesMutation.mutate({ id: editingUser.id, roles: Array.from(selectedRoles) });
    };

    // Hàm mở modal Confirm khi ấn nút Khóa
    const handleLockUserClick = (userId, username) => {
        setConfirmModal({
            isOpen: true,
            userId: userId,
            username: username
        });
    };

    // Hàm thực hiện hành động khi người dùng ấn "Đồng ý" trên Modal
    const onConfirmLock = () => {
        if (confirmModal.userId) {
            // Thực hiện update role thành LOCKED
            updateRolesMutation.mutate({ 
                id: confirmModal.userId, 
                roles: ["ROLE_LOCKED"] 
            });
        }
    };

    const users = usersPage?.content || [];
    const totalPages = usersPage?.totalPages || 1;
    const totalElements = usersPage?.totalElements || 0;

    return (
        <div className="page-admin-users">
            <h1 className="h1">Quản lý Người dùng</h1>

            <div className="card" style={{ overflowX: "auto" }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Roles</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={4}><div className="loading" style={{ padding: 16 }}>Đang tải...</div></td></tr>
                        ) : isError ? (
                            <tr><td colSpan={4} style={{ color: 'red', padding: 16 }}>Lỗi: {error.message}</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={4}><div className="muted" style={{ padding: 16, textAlign: "center" }}>Không có người dùng nào.</div></td></tr>
                        ) : (
                            users.map(user => {
                                const isLocked = user.roles && user.roles.includes("ROLE_LOCKED");
                                return (
                                    <tr key={user.id} style={{ opacity: isLocked ? 0.6 : 1, backgroundColor: isLocked ? '#fff0f0' : 'inherit' }}>
                                        <td>{user.id}</td>
                                        <td>
                                            {user.username}
                                            {isLocked && <span style={{ color: 'red', fontWeight: 'bold', marginLeft: '5px' }}>(LOCKED)</span>}
                                        </td>
                                        <td>{(user.roles || []).join(', ')}</td>
                                        <td style={{ whiteSpace: "nowrap" }}>
                                            <button
                                                className="btn btn-small"
                                                onClick={() => handleEditRoles(user)}
                                                style={{ marginRight: 8 }}
                                            >
                                                Sửa Roles
                                            </button>
                                             <button
                                                className="btn btn-danger btn-small"
                                                onClick={() => handleLockUserClick(user.id, user.username)}
                                                disabled={updateRolesMutation.isPending || isLocked}
                                                style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                                            >
                                                {isLocked ? "Đã Khóa" : "Khóa"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination" style={{ marginTop: 12 }}>
                <button className="btn" disabled={page <= 0 || isLoading} onClick={() => setPage(p => p - 1)}>← Trước</button>
                <span>Trang {page + 1} / {totalPages}</span>
                <button className="btn" disabled={page >= totalPages - 1 || isLoading} onClick={() => setPage(p => p + 1)}>Sau →</button>
                <span className="muted" style={{ marginLeft: "auto" }}>Tổng số: {totalElements}</span>
            </div>

            {/* Modal chỉnh sửa Roles */}
            {editingUser && (
                <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !updateRolesMutation.isPending) setEditingUser(null); }}>
                    <div className="modal">
                        <div className="card-title">Sửa vai trò cho "{editingUser.username}"</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                            {ALL_ROLES.map(role => (
                                <label key={role} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRoles.has(role)}
                                        onChange={(e) => handleRoleChange(role, e.target.checked)}
                                        style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                    />
                                    {role.replace('ROLE_', '')}
                                </label>
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setEditingUser(null)}
                                disabled={updateRolesMutation.isPending}
                            >
                                Huỷ
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSaveRoles}
                                disabled={updateRolesMutation.isPending}
                            >
                                {updateRolesMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={onConfirmLock}
                title="Xác nhận khóa tài khoản"
            >
                <p>Bạn có chắc chắn muốn <strong>KHÓA</strong> tài khoản <strong>"{confirmModal.username}"</strong> (ID: {confirmModal.userId})?</p>
                <p style={{ color: 'red', marginTop: '8px', fontSize: '0.9em' }}>
                    Người dùng này sẽ không thể đăng nhập hoặc đặt hàng sau khi bị khóa.
                </p>
            </ConfirmModal>
        </div>
    );
}