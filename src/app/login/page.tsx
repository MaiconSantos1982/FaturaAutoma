'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Por favor, preencha todos os campos');
            return;
        }

        setIsLoading(true);

        const result = await signIn(email, password);

        if (result.error) {
            setError(result.error);
        }

        setIsLoading(false);
    };

    const isConfigured = isSupabaseConfigured();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-xl mb-4">
                        <FileText className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">FaturaAutom</h1>
                    <p className="text-gray-500 mt-2">Sistema de Gestão de Faturas</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">Entrar na sua conta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!isConfigured ? (
                            <div className="text-center py-4">
                                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-4">
                                    <p className="font-medium">Configuração necessária</p>
                                    <p className="text-sm mt-1">
                                        Configure as variáveis de ambiente do Supabase no arquivo{' '}
                                        <code className="bg-yellow-100 px-1 rounded">.env.local</code>
                                    </p>
                                </div>
                                <div className="text-left bg-gray-50 p-4 rounded-lg font-mono text-sm">
                                    <p>NEXT_PUBLIC_SUPABASE_URL=...</p>
                                    <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />

                                <Input
                                    label="Senha"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                />

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    isLoading={isLoading || authLoading}
                                >
                                    Entrar
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-gray-500 mt-6">
                    © {new Date().getFullYear()} FaturaAutom. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
