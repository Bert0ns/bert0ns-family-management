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
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Share2,
  PieChart,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  CreditCard,
  Building,
  Plane,
  Sparkles,
  LucideProps,
} from 'lucide-react-native';

interface IconHelperProps extends LucideProps {
  name: string;
}

export const IconHelper: React.FC<IconHelperProps> = ({ name, ...props }) => {
  switch (name?.toLowerCase()) {
    case 'shoppingcart':
    case 'groceries':
      return <ShoppingCart {...props} />;
    case 'utensils':
    case 'dining':
    case 'restaurant':
      return <Utensils {...props} />;
    case 'zap':
    case 'utilities':
    case 'bills':
      return <Zap {...props} />;
    case 'car':
    case 'transport':
    case 'transportation':
      return <Car {...props} />;
    case 'home':
    case 'housing':
    case 'rent':
      return <Home {...props} />;
    case 'heartpulse':
    case 'health':
    case 'pharmacy':
      return <HeartPulse {...props} />;
    case 'film':
    case 'entertainment':
      return <Film {...props} />;
    case 'shoppingbag':
    case 'shopping':
      return <ShoppingBag {...props} />;
    case 'graduationcap':
    case 'education':
      return <GraduationCap {...props} />;
    case 'dollarsign':
      return <DollarSign {...props} />;
    case 'trendingup':
      return <TrendingUp {...props} />;
    case 'filetext':
      return <FileText {...props} />;
    case 'users':
      return <Users {...props} />;
    case 'settings':
      return <Settings {...props} />;
    case 'calendar':
      return <Calendar {...props} />;
    case 'search':
      return <Search {...props} />;
    case 'filter':
      return <Filter {...props} />;
    case 'upload':
      return <Upload {...props} />;
    case 'download':
      return <Download {...props} />;
    case 'creditcard':
      return <CreditCard {...props} />;
    case 'building':
      return <Building {...props} />;
    case 'plane':
      return <Plane {...props} />;
    case 'piechart':
      return <PieChart {...props} />;
    case 'tag':
    default:
      return <Tag {...props} />;
  }
};
