// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'
// import isAuth, { isSubscribe } from './middleware/frontAuth'

// const protectedRoutes = "/app";

// export function middleware(request: NextRequest) {
//   if (request.nextUrl.pathname.includes(protectedRoutes) && !isAuth(request)) {
//     return NextResponse.rewrite(new URL('/login', request.url));
//   }
//   if ((request.nextUrl.pathname == "/" || request.nextUrl.pathname == "/login" || request.nextUrl.pathname.includes("login")) && isAuth(request)) {
//     return NextResponse.redirect(new URL('/app', request.url));
//   }
//   if (request.nextUrl.pathname.includes(protectedRoutes) && !request.nextUrl.pathname.includes("/app/plan") && !isSubscribe(request)) {
//     return NextResponse.rewrite(new URL('/app/plan', request.url));
//   }
// }

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import isAuth, { isSubscribe } from './middleware/frontAuth'

const protectedRoutes = "/app";

export function middleware(request: NextRequest) {
  // ⭐ EXCLURE toutes les routes API du middleware
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Logique originale pour le frontend
  if (request.nextUrl.pathname.includes(protectedRoutes) && !isAuth(request)) {
    return NextResponse.rewrite(new URL('/login', request.url));
  }
  
  if ((request.nextUrl.pathname == "/" || request.nextUrl.pathname == "/login" || request.nextUrl.pathname.includes("login")) && isAuth(request)) {
    return NextResponse.redirect(new URL('/app', request.url));
  }
  
  if (request.nextUrl.pathname.includes(protectedRoutes) && !request.nextUrl.pathname.includes("/app/plan") && !isSubscribe(request)) {
    return NextResponse.rewrite(new URL('/app/plan', request.url));
  }

  return NextResponse.next()
}