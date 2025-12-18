import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    total: number;
    page: number;
    pages: number;
    limit: number;
}

// Success response
export function successResponse<T>(
    data: T,
    message?: string,
    status = 200
): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
            message,
        },
        { status }
    );
}

// Paginated success response
export function paginatedResponse<T>(
    data: T,
    total: number,
    page: number,
    limit: number,
    message?: string
): NextResponse<PaginatedResponse<T>> {
    const pages = Math.ceil(total / limit);
    return NextResponse.json(
        {
            success: true,
            data,
            total,
            page,
            pages,
            limit,
            message,
        },
        { status: 200 }
    );
}

// Error response
export function errorResponse(
    message: string,
    status = 400
): NextResponse<ApiResponse> {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status }
    );
}

// Unauthorized response
export function unauthorizedResponse(
    message = 'Não autorizado'
): NextResponse<ApiResponse> {
    return errorResponse(message, 401);
}

// Forbidden response
export function forbiddenResponse(
    message = 'Acesso negado'
): NextResponse<ApiResponse> {
    return errorResponse(message, 403);
}

// Not found response
export function notFoundResponse(
    message = 'Recurso não encontrado'
): NextResponse<ApiResponse> {
    return errorResponse(message, 404);
}

// Internal server error response
export function serverErrorResponse(
    message = 'Erro interno do servidor'
): NextResponse<ApiResponse> {
    return errorResponse(message, 500);
}

// Parse pagination params
export function parsePaginationParams(
    searchParams: URLSearchParams
): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}
