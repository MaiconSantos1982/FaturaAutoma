'use client';

import React, { useState, useEffect } from 'react';
import { Save, Trash2, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User, ApprovalRule, UserRole } from '@/types';
import { formatCurrency } from '@/lib/utils';

const tabs = [
    { id: 'company', label: 'Empresa' },
    { id: 'users', label: 'Usuários' },
    { id: 'rules', label: 'Regras de Aprovação' },
];

const roleOptions = [
    { value: 'user', label: 'Usuário' },
    { value: 'master', label: 'Aprovador' },
    { value: 'super_admin', label: 'Administrador' },
];

export default function AdminPage() {
    const { checkRole } = useAuth();
    const [activeTab, setActiveTab] = useState('company');

    // Check if user has admin permissions
    if (!checkRole(['super_admin'])) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
                <p className="text-gray-500">Gerencie as configurações da sua empresa</p>
            </div>

            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="mt-6">
                {activeTab === 'company' && <CompanySettings />}
                {activeTab === 'users' && <UsersManagement />}
                {activeTab === 'rules' && <ApprovalRulesSettings />}
            </div>
        </div>
    );
}

// Company Settings Tab
function CompanySettings() {
    const { company } = useAuth();
    const [autoApproveLimit, setAutoApproveLimit] = useState('');
    const [defaultDebitAccount, setDefaultDebitAccount] = useState('');
    const [defaultCreditAccount, setDefaultCreditAccount] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (company) {
            setAutoApproveLimit(company.auto_approve_limit?.toString() || '0');
            setDefaultDebitAccount(company.default_debit_account || '');
            setDefaultCreditAccount(company.default_credit_account || '');
        }
    }, [company]);

    const handleSave = async () => {
        if (!company) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('companies')
                .update({
                    auto_approve_limit: parseFloat(autoApproveLimit) || 0,
                    default_debit_account: defaultDebitAccount || null,
                    default_credit_account: defaultCreditAccount || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', company.id);

            if (error) throw error;

            setSuccessMessage('Configurações salvas com sucesso!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error saving company settings:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {successMessage && (
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        {successMessage}
                    </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>Limite de Auto-aprovação:</strong> Faturas com valor igual ou inferior a este
                        limite serão aprovadas automaticamente.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Limite de Auto-aprovação (R$)"
                        type="number"
                        placeholder="0,00"
                        value={autoApproveLimit}
                        onChange={(e) => setAutoApproveLimit(e.target.value)}
                        helperText="Faturas até este valor são auto-aprovadas"
                    />
                    <Input
                        label="Conta Débito Padrão"
                        placeholder="Ex: 4.1.01.01"
                        value={defaultDebitAccount}
                        onChange={(e) => setDefaultDebitAccount(e.target.value)}
                    />
                    <Input
                        label="Conta Crédito Padrão"
                        placeholder="Ex: 2.1.01"
                        value={defaultCreditAccount}
                        onChange={(e) => setDefaultCreditAccount(e.target.value)}
                    />
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave} isLoading={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Configurações
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Users Management Tab
function UsersManagement() {
    const { company } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'user' as UserRole,
        department: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [company?.id]);

    const fetchUsers = async () => {
        if (!company?.id) return;

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('company_id', company.id)
                .order('name');

            if (error) throw error;
            setUsers(data as User[]);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const openAddModal = () => {
        setSelectedUser(null);
        setFormData({ name: '', email: '', role: 'user', department: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department || '',
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!company?.id) return;

        setIsSaving(true);
        try {
            if (selectedUser) {
                // Update existing user
                const { error } = await supabase
                    .from('users')
                    .update({
                        name: formData.name,
                        role: formData.role,
                        department: formData.department || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', selectedUser.id);

                if (error) throw error;
                setSuccessMessage('Usuário atualizado!');
            } else {
                // Create new user
                const { error } = await supabase
                    .from('users')
                    .insert({
                        company_id: company.id,
                        name: formData.name,
                        email: formData.email.toLowerCase(),
                        role: formData.role,
                        department: formData.department || null,
                    });

                if (error) throw error;
                setSuccessMessage('Usuário adicionado!');
            }

            setIsModalOpen(false);
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: unknown) {
            console.error('Error saving user:', err);
            if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
                setSuccessMessage('Email já cadastrado.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', selectedUser.id);

            if (error) throw error;

            setSuccessMessage('Usuário desativado!');
            setIsDeleteModalOpen(false);
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error deleting user:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'super_admin':
                return 'danger';
            case 'master':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'super_admin':
                return 'Admin';
            case 'master':
                return 'Aprovador';
            default:
                return 'Usuário';
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Nome',
            render: (user: User) => (
                <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Função',
            render: (user: User) => (
                <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                </Badge>
            ),
        },
        {
            key: 'department',
            header: 'Departamento',
            render: (user: User) => (
                <span className="text-gray-600">{user.department || '-'}</span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (user: User) => (
                <Badge variant={user.is_active ? 'success' : 'default'}>
                    {user.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Ações',
            render: (user: User) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(user)}>
                        Editar
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteModal(user)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
            className: 'text-right',
        },
    ];

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Usuários</CardTitle>
                    <Button onClick={openAddModal}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Adicionar Usuário
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {successMessage && (
                        <div className="mx-6 mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            {successMessage}
                        </div>
                    )}
                    <Table
                        columns={columns}
                        data={users}
                        isLoading={isLoading}
                        emptyMessage="Nenhum usuário encontrado"
                    />
                </CardContent>
            </Card>

            {/* Add/Edit User Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedUser ? 'Editar Usuário' : 'Adicionar Usuário'}
            >
                <div className="space-y-4">
                    <Input
                        label="Nome"
                        placeholder="Nome completo"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                        label="Email"
                        type="email"
                        placeholder="email@empresa.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!!selectedUser}
                    />
                    <Select
                        label="Função"
                        options={roleOptions}
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    />
                    <Input
                        label="Departamento"
                        placeholder="Ex: Financeiro"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveUser} isLoading={isSaving}>
                            {selectedUser ? 'Salvar Alterações' : 'Adicionar'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar Desativação"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Tem certeza que deseja desativar o usuário{' '}
                        <strong>{selectedUser?.name}</strong>?
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={handleDeleteUser} isLoading={isSaving}>
                            Desativar
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// Approval Rules Tab
function ApprovalRulesSettings() {
    const { company } = useAuth();
    const [rules, setRules] = useState<ApprovalRule[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingLevel, setSavingLevel] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, [company?.id]);

    const fetchData = async () => {
        if (!company?.id) return;

        try {
            const [rulesResponse, usersResponse] = await Promise.all([
                supabase
                    .from('approval_rules')
                    .select('*, approver:users!approver_id(*)')
                    .eq('company_id', company.id)
                    .order('approval_level'),
                supabase
                    .from('users')
                    .select('*')
                    .eq('company_id', company.id)
                    .in('role', ['super_admin', 'master'])
                    .eq('is_active', true),
            ]);

            if (rulesResponse.error) throw rulesResponse.error;
            if (usersResponse.error) throw usersResponse.error;

            // Ensure we have 3 levels
            const existingRules = rulesResponse.data as ApprovalRule[];
            const allRules: ApprovalRule[] = [];

            for (let level = 1; level <= 3; level++) {
                const existing = existingRules.find((r) => r.approval_level === level);
                if (existing) {
                    allRules.push(existing);
                } else {
                    allRules.push({
                        id: `new-${level}`,
                        company_id: company.id,
                        approval_level: level,
                        min_amount: level === 1 ? 0 : (level - 1) * 5000,
                        max_amount: level * 5000,
                        auto_approve: false,
                        approver_id: undefined,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                }
            }

            setRules(allRules);
            setUsers(usersResponse.data as User[]);
        } catch (err) {
            console.error('Error fetching approval rules:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateRule = (level: number, field: string, value: unknown) => {
        setRules((prev) =>
            prev.map((rule) =>
                rule.approval_level === level ? { ...rule, [field]: value } : rule
            )
        );
    };

    const saveRule = async (level: number) => {
        if (!company?.id) return;

        const rule = rules.find((r) => r.approval_level === level);
        if (!rule) return;

        setSavingLevel(level);
        try {
            const data = {
                company_id: company.id,
                approval_level: rule.approval_level,
                min_amount: rule.min_amount,
                max_amount: rule.max_amount || null,
                auto_approve: rule.auto_approve,
                approver_id: rule.auto_approve ? null : rule.approver_id || null,
                is_active: true,
                updated_at: new Date().toISOString(),
            };

            if (rule.id.startsWith('new-')) {
                // Insert new rule
                const { error } = await supabase.from('approval_rules').insert(data);
                if (error) throw error;
            } else {
                // Update existing rule
                const { error } = await supabase
                    .from('approval_rules')
                    .update(data)
                    .eq('id', rule.id);
                if (error) throw error;
            }

            setSuccessMessage(`Nível ${level} salvo com sucesso!`);
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error saving rule:', err);
        } finally {
            setSavingLevel(null);
        }
    };

    const approverOptions = [
        { value: '', label: 'Selecione um aprovador' },
        ...users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {successMessage && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {successMessage}
                </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    Configure os níveis de aprovação baseados no valor das faturas. Cada nível pode ser
                    configurado para aprovação automática ou manual por um aprovador específico.
                </p>
            </div>

            {rules.map((rule) => (
                <Card key={rule.approval_level}>
                    <CardHeader>
                        <CardTitle>Nível {rule.approval_level}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Valor Mínimo (R$)"
                                type="number"
                                value={rule.min_amount.toString()}
                                onChange={(e) =>
                                    updateRule(rule.approval_level, 'min_amount', parseFloat(e.target.value) || 0)
                                }
                            />
                            <Input
                                label="Valor Máximo (R$)"
                                type="number"
                                value={rule.max_amount?.toString() || ''}
                                onChange={(e) =>
                                    updateRule(rule.approval_level, 'max_amount', parseFloat(e.target.value) || null)
                                }
                                placeholder="Sem limite"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rule.auto_approve}
                                    onChange={(e) => updateRule(rule.approval_level, 'auto_approve', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Aprovação Automática
                                </span>
                            </label>
                        </div>

                        {!rule.auto_approve && (
                            <Select
                                label="Aprovador Responsável"
                                options={approverOptions}
                                value={rule.approver_id || ''}
                                onChange={(e) => updateRule(rule.approval_level, 'approver_id', e.target.value || undefined)}
                            />
                        )}

                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => saveRule(rule.approval_level)}
                                isLoading={savingLevel === rule.approval_level}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Salvar Nível {rule.approval_level}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
