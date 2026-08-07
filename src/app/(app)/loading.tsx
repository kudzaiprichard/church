import { PageLoader } from "@/components/loader/page-loader";

/**
 * Shown while any page in the member area fetches what it needs.
 *
 * Next wraps the segment in a Suspense boundary for this automatically, and it
 * sits *inside* `(app)/layout`, so the rail, the top bar and the breadcrumb
 * stay put and only the panel changes. That is the reason it lives here rather
 * than at the root: a navigation inside the app should never look like the
 * whole application went away and came back.
 */
export default function Loading() {
  return <PageLoader />;
}
