import { currentUser } from "@/lib/session";
import { listVideos } from "@/lib/videos-server";
import { toPublic } from "@/lib/video";
import { Library } from "@/components/Library";
export const dynamic = "force-dynamic";
export const metadata = { title: "My videos | LoomIsDead" };
export default async function AppHome() { const u = (await currentUser())!; return <Library initial={(await listVideos(u.id, u.demo)).map(toPublic)} />; }
