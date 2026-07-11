import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "admin" | "teacher" | "student";

const loginRequiredRoutes = [
  "/de-thi",
  "/lam-bai",
  "/ket-qua",
  "/tinh-diem",
];

function startsWithRoute(pathname: string, route: string) {
  return (
    pathname === route ||
    pathname.startsWith(`${route}/`)
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const needsLogin =
    loginRequiredRoutes.some((route) =>
      startsWithRoute(pathname, route)
    ) ||
    startsWithRoute(pathname, "/trac-nghiem") ||
    startsWithRoute(pathname, "/admin");

  if (!user && needsLogin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/dang-nhap";
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(loginUrl);
  }

  if (
    user &&
    (pathname === "/dang-nhap" ||
      pathname === "/dat-lai-mat-khau")
  ) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";

    return NextResponse.redirect(homeUrl);
  }

  if (!user) {
    return response;
  }

  const requiresRoleCheck =
    startsWithRoute(pathname, "/trac-nghiem") ||
    startsWithRoute(pathname, "/admin");

  if (!requiresRoleCheck) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;

  if (
    startsWithRoute(pathname, "/admin") &&
    role !== "admin"
  ) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.searchParams.set(
      "error",
      "khong-co-quyen-admin"
    );

    return NextResponse.redirect(homeUrl);
  }

  if (
    startsWithRoute(pathname, "/trac-nghiem") &&
    role !== "teacher" &&
    role !== "admin"
  ) {
    const examsUrl = request.nextUrl.clone();
    examsUrl.pathname = "/de-thi";
    examsUrl.searchParams.set(
      "error",
      "khong-co-quyen-tao-de"
    );

    return NextResponse.redirect(examsUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};