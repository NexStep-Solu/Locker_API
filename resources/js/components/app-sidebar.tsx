import { Link } from '@inertiajs/react';
import { BookOpen, Boxes, FileText, LayoutGrid, MapPin, Package, Search, Server, Settings, TestTube, TriangleAlert, Archive } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Home',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Store Bags',
        href: '/admin/storage-batches',
        icon: Package,
    },
    {
        title: 'Bags',
        href: '/admin/bags',
        icon: Boxes,
    },
    {
        title: 'Bag Moves',
        href: '/admin/location-updates',
        icon: MapPin,
    },
    {
        title: 'Free Drawers',
        href: '/admin/locker/drawers',
        icon: Archive,
    },
    {
        title: 'Find in Locker',
        href: '/admin/locker/bags',
        icon: Search,
    },
    {
        title: 'Needs Attention',
        href: '/admin/failed-integrations',
        icon: TriangleAlert,
    },
    {
        title: 'Activity History',
        href: '/admin/integration-logs',
        icon: FileText,
    },
    {
        title: 'System Health',
        href: '/admin/system-status',
        icon: Server,
    },
    {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
    },
    // {
    //     title: 'Practice Locker',
    //     href: '/mock/locker',
    //     icon: TestTube,
    // },
];

const footerNavItems: NavItem[] = [
    {
        title: 'POS API Docs',
        href: '/docs/pos',
        icon: BookOpen,
    },
    {
        title: 'Locker API Docs',
        href: '/docs/locker',
        icon: FileText,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
