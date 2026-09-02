import React from 'react';
import {
  ShoppingCart,
  Utensils,
  Zap,
  Car,
  Home,
  HeartPulse,
  Film,
  ShoppingBag,
  GraduationCap,
  Tag,
  DollarSign,
  TrendingUp,
  FileText,
  Users,
  Settings,
  Calendar,
  Search,
  Filter,
  Upload,
  Download,
  CreditCard,
  Building,
  Plane,
  PieChart,
  LucideProps,
  LucideIcon,
} from 'lucide-react-native';

const ICON_MAP: Record<string, LucideIcon> = {
  shoppingcart: ShoppingCart,
  groceries: ShoppingCart,
  utensils: Utensils,
  dining: Utensils,
  restaurant: Utensils,
  zap: Zap,
  utilities: Zap,
  bills: Zap,
  car: Car,
  transport: Car,
  transportation: Car,
  home: Home,
  housing: Home,
  rent: Home,
  heartpulse: HeartPulse,
  health: HeartPulse,
  pharmacy: HeartPulse,
  film: Film,
  entertainment: Film,
  shoppingbag: ShoppingBag,
  shopping: ShoppingBag,
  graduationcap: GraduationCap,
  education: GraduationCap,
  dollarsign: DollarSign,
  trendingup: TrendingUp,
  filetext: FileText,
  users: Users,
  settings: Settings,
  calendar: Calendar,
  search: Search,
  filter: Filter,
  upload: Upload,
  download: Download,
  creditcard: CreditCard,
  building: Building,
  plane: Plane,
  piechart: PieChart,
  tag: Tag,
};

interface IconHelperProps extends LucideProps {
  name: string;
}

export const IconHelper: React.FC<IconHelperProps> = ({ name, ...props }) => {
  const IconComponent = (name && ICON_MAP[name.toLowerCase()]) || Tag;
  return <IconComponent {...props} />;
};
