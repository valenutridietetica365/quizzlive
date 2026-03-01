import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const locales = ['es', 'en']
const defaultLocale = 'es'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Refresh session if expired by requesting the user object
    await supabase.auth.getUser()

    // --- i18n logic ---
    const pathname = request.nextUrl.pathname

    if (
        pathname.startsWith('/_next') ||
        pathname.includes('.') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/teacher') ||
        pathname.startsWith('/play') ||
        pathname.startsWith('/join')
    ) {
        return supabaseResponse
    }

    const pathnameIsMissingLocale = locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    )

    if (pathnameIsMissingLocale) {
        const redirected = NextResponse.redirect(
            new URL(`/${defaultLocale}${pathname === '/' ? '' : pathname}`, request.url)
        )
        // Copy cookies over to the redirect response
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            redirected.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirected
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
