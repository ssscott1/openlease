import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * /admin/* is the staff CRM: no locale prefix, gated by Supabase auth.
 * Everything else is the public, localised site.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return handleAdmin(request);
  }

  return intlMiddleware(request);
}

async function handleAdmin(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // Misconfigured deployment — let the page render its own error rather
    // than failing (or looping) at the proxy.
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session and gate access. Role checks (admin/sales) happen
  // server-side in the admin layout on top of RLS — this is the first fence.
  // The proxy only ever redirects in ONE direction (towards login): signed-in
  // users are never bounced off the login page, because any counterpart
  // redirect (e.g. a signed-in user without a staff profile) would loop.
  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    // Auth service unreachable — treat as signed out.
  }

  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static assets and Next internals; run for pages + /admin.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
