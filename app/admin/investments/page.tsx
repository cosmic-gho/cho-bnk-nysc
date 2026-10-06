"use client";

import { useEffect, useState } from "react";
import { adminInvestmentService } from "@/lib/admin-services";
import { InvestmentPlan } from "@/lib/supabase-services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  DollarSign,
  Plus,
  Layers,
  Sparkles,
  LineChart,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
  Check,
  Flame,
} from "lucide-react";

interface AdminUserInvestment {
  id: number;
  user_id: string;
  account_id: number;
  plan_id: number;
  amount: number;
  expected_return: number;
  total_payout: number;
  status: "active" | "matured" | "claimed" | "cancelled";
  start_date: string;
  end_date: string;
  created_at: string;
  plan?: InvestmentPlan;
  account?: {
    id: number;
    account_number: string;
    balance: string;
  };
  user?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function AdminInvestmentsPage() {
  const [investments, setInvestments] = useState<AdminUserInvestment[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCapitalInvested: 0,
    totalReturnsPaid: 0,
    activeInvestments: 0,
    totalPlans: 0,
    totalTradingVolume: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("investments");

  // Plan creation modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    category: "fixed_deposit",
    min_amount: 100,
    max_amount: 50000,
    interest_rate: 8.5,
    duration_days: 90,
    risk_level: "low",
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Settlement modal
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<AdminUserInvestment | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const filters = filterStatus !== "all" ? { status: filterStatus } : undefined;

      const [investmentsData, plansData, statsData, ordersData] = await Promise.allSettled([
        adminInvestmentService.getAllUserInvestments(filters),
        adminInvestmentService.getAllPlans(),
        adminInvestmentService.getInvestmentStats(),
        adminInvestmentService.getAllAssetOrders(),
      ]);

      if (investmentsData.status === "fulfilled") {
        setInvestments(investmentsData.value as AdminUserInvestment[]);
      }
      if (plansData.status === "fulfilled") {
        setPlans(plansData.value as InvestmentPlan[]);
      }
      if (statsData.status === "fulfilled") {
        setStats(statsData.value);
      }
      if (ordersData.status === "fulfilled") {
        setOrders(ordersData.value);
      }
    } catch (err: any) {
      console.error("Error loading admin investments data:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load admin investment data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      description: "",
      category: "fixed_deposit",
      min_amount: 100,
      max_amount: 50000,
      interest_rate: 8.5,
      duration_days: 90,
      risk_level: "low",
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: InvestmentPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      category: plan.category,
      min_amount: plan.min_amount,
      max_amount: plan.max_amount,
      interest_rate: plan.interest_rate,
      duration_days: plan.duration_days,
      risk_level: plan.risk_level,
    });
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.interest_rate || !planForm.duration_days) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required plan parameters.",
      });
      return;
    }

    try {
      setIsSavingPlan(true);
      if (editingPlan) {
        await adminInvestmentService.updatePlan(editingPlan.id, planForm);
        toast({
          title: "Plan Updated",
          description: `Successfully updated ${planForm.name}`,
        });
      } else {
        await adminInvestmentService.createPlan({
          ...planForm,
          is_active: true,
        });
        toast({
          title: "Plan Created",
          description: `Created new investment plan: ${planForm.name}`,
        });
      }

      setIsPlanModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error Saving Plan",
        description: err.message,
      });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleTogglePlanActive = async (plan: InvestmentPlan) => {
    try {
      await adminInvestmentService.updatePlan(plan.id, { is_active: !plan.is_active });
      toast({
        title: "Status Updated",
        description: `${plan.name} is now ${!plan.is_active ? "Active" : "Inactive"}.`,
      });
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  };

  // Force Mature
  const handleForceMature = async (investmentId: number) => {
    try {
      await adminInvestmentService.forceMatureInvestment(investmentId);
      toast({
        title: "Investment Matured",
        description: `Investment #${investmentId} has been marked as matured.`,
      });
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  };

  // Settle and Pay Out
  const handleSettleAndPayout = async () => {
    if (!selectedInvestment) return;
    try {
      setIsSettling(true);
      await adminInvestmentService.settleAndPayoutInvestment(selectedInvestment.id);
      toast({
        title: "Payout Settled! 💰",
        description: `$${Number(selectedInvestment.total_payout).toFixed(2)} has been credited directly to user account.`,
      });
      setSettleModalOpen(false);
      setSelectedInvestment(null);
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Settlement Error",
        description: err.message,
      });
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Oversee user term deposit subscriptions, investment plans, and live portfolio trading activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            onClick={handleOpenCreatePlan}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs"
          >
            <Plus className="h-4 w-4" /> New Investment Plan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Capital Invested</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${stats.totalCapitalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {stats.activeInvestments} active subscription(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${stats.totalReturnsPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Claimed or settled profits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Investment Plans</CardTitle>
            <Layers className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.filter((p) => p.is_active).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for user subscription</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asset Trading Volume</CardTitle>
            <LineChart className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${stats.totalTradingVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Stocks & crypto orders executed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="investments" className="text-xs sm:text-sm">
            User Investments ({investments.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-xs sm:text-sm">
            Plans Catalog ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="trading" className="text-xs sm:text-sm">
            Trade Orders ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: USER INVESTMENTS */}
        {/* ========================================================================= */}
        <TabsContent value="investments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Filter Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="matured">Matured</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">Showing {investments.length} investment(s)</span>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Capital</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Total Payout</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading investments...
                    </TableCell>
                  </TableRow>
                ) : investments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No user investments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  investments.map((inv) => {
                    const userName = inv.user
                      ? `${inv.user.first_name || ""} ${inv.user.last_name || ""}`.trim() || inv.user.username
                      : "User";

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">#{inv.id}</TableCell>
                        <TableCell>
                          <div className="font-medium text-xs">{userName}</div>
                          <div className="text-[11px] text-muted-foreground">{inv.user?.email || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-xs">{inv.plan?.name || `Plan #${inv.plan_id}`}</span>
                          <div className="text-[10px] text-muted-foreground">
                            {inv.plan?.interest_rate ? `${inv.plan.interest_rate}% APY` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          ${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-emerald-600 font-semibold text-xs">
                          +${Number(inv.expected_return).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-black text-xs">
                          ${Number(inv.total_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          <div>Start: {new Date(inv.start_date).toLocaleDateString()}</div>
                          <div>End: {new Date(inv.end_date).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              inv.status === "claimed"
                                ? "outline"
                                : inv.status === "matured"
                                ? "default"
                                : inv.status === "cancelled"
                                ? "secondary"
                                : "default"
                            }
                            className={
                              inv.status === "claimed"
                                ? "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 text-[10px]"
                                : inv.status === "matured"
                                ? "bg-amber-500 text-white text-[10px]"
                                : "bg-emerald-600 text-white text-[10px]"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {inv.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleForceMature(inv.id)}
                              className="text-[11px] h-7 px-2"
                              title="Mark investment as matured"
                            >
                              Mature Now
                            </Button>
                          )}
                          {(inv.status === "active" || inv.status === "matured") && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedInvestment(inv);
                                setSettleModalOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2"
                            >
                              Pay Out
                            </Button>
                          )}
                          {inv.status === "claimed" && (
                            <span className="text-[11px] text-muted-foreground">Paid</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: PLANS CATALOG */}
        {/* ========================================================================= */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>APY Rate</TableHead>
                  <TableHead>Lockup Term</TableHead>
                  <TableHead>Min / Max Deposit</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-bold text-xs">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</div>
                    </TableCell>
                    <TableCell className="capitalize text-xs">{p.category.replace("_", " ")}</TableCell>
                    <TableCell className="text-emerald-600 font-black text-sm">{p.interest_rate}%</TableCell>
                    <TableCell className="text-xs">{p.duration_days} Days</TableCell>
                    <TableCell className="text-xs">
                      ${p.min_amount.toLocaleString()} - ${p.max_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.risk_level === "low"
                            ? "outline"
                            : p.risk_level === "moderate"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-[10px] capitalize"
                      >
                        {p.risk_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.is_active ? "default" : "secondary"}
                        className={p.is_active ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditPlan(p)}
                        className="text-xs h-7 px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={p.is_active ? "ghost" : "outline"}
                        onClick={() => handleTogglePlanActive(p)}
                        className="text-xs h-7 px-2"
                      >
                        {p.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: TRADING ACTIVITY */}
        {/* ========================================================================= */}
        <TabsContent value="trading" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Order Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Price per Unit</TableHead>
                  <TableHead>Total Volume</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No trading activity recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((ord) => (
                    <TableRow key={ord.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(ord.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {ord.user ? `${ord.user.first_name || ""} ${ord.user.last_name || ""}`.trim() || ord.user.username : "User"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ord.order_type === "buy" ? "default" : "destructive"}
                          className="text-[10px] uppercase font-bold"
                        >
                          {ord.order_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-xs">{ord.asset_symbol}</TableCell>
                      <TableCell className="text-xs">{Number(ord.quantity).toFixed(4)}</TableCell>
                      <TableCell className="text-xs">${Number(ord.price_per_unit).toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-xs">${Number(ord.total_amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          {ord.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* DIALOG: CREATE / EDIT PLAN */}
      {/* ========================================================================= */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Investment Plan" : "Create New Investment Plan"}</DialogTitle>
            <DialogDescription className="text-xs">
              Configure returns, lockup term, and requirements for this plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Plan Name</Label>
              <Input
                placeholder="e.g. Sovereign Bond Vault"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select
                  value={planForm.category}
                  onValueChange={(val) => setPlanForm({ ...planForm, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                    <SelectItem value="bonds">Treasury Bonds</SelectItem>
                    <SelectItem value="crypto_staking">Crypto Staking</SelectItem>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Risk Profile</Label>
                <Select
                  value={planForm.risk_level}
                  onValueChange={(val) => setPlanForm({ ...planForm, risk_level: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="moderate">Moderate Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Interest APY (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={planForm.interest_rate}
                  onChange={(e) => setPlanForm({ ...planForm, interest_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Duration (Days)</Label>
                <Input
                  type="number"
                  value={planForm.duration_days}
                  onChange={(e) => setPlanForm({ ...planForm, duration_days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Min Deposit ($)</Label>
                <Input
                  type="number"
                  value={planForm.min_amount}
                  onChange={(e) => setPlanForm({ ...planForm, min_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Max Limit ($)</Label>
                <Input
                  type="number"
                  value={planForm.max_amount}
                  onChange={(e) => setPlanForm({ ...planForm, max_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Brief summary of the plan structure..."
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isSavingPlan}
              onClick={handleSavePlan}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSavingPlan ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Save Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: SETTLE & PAYOUT CONFIRMATION */}
      {/* ========================================================================= */}
      <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Settle Investment Payout
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm direct payment of principal plus interest into the user&apos;s bank account.
            </DialogDescription>
          </DialogHeader>

          {selectedInvestment && (
            <div className="p-3 rounded-xl border bg-muted/30 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investment ID:</span>
                <span className="font-mono">#{selectedInvestment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Capital:</span>
                <span>${Number(selectedInvestment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Profit Accrued:</span>
                <span>+${Number(selectedInvestment.expected_return).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t pt-1">
                <span>Total Payout to Credit:</span>
                <span className="text-emerald-600">${Number(selectedInvestment.total_payout).toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSettleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isSettling}
              onClick={handleSettleAndPayout}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSettling ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Confirm Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
