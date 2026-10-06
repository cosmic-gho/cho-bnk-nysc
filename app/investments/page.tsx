"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  investmentService,
  accountService,
  InvestmentPlan,
  UserInvestment,
  AssetHolding,
  AssetOrder,
} from "@/lib/supabase-services";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Clock,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  LineChart,
  Coins,
  Sparkles,
  Layers,
  PieChart,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Flame,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Account {
  id: number;
  account_number: string;
  account_type: { name: string };
  balance: string;
}

interface MarketAsset {
  symbol: string;
  name: string;
  type: "crypto" | "stock";
  price: number;
  change24h: number;
  volume: string;
  category: string;
}

const MARKET_ASSETS: MarketAsset[] = [
  { symbol: "BTC", name: "Bitcoin", type: "crypto", price: 68450.25, change24h: 3.42, volume: "$32.4B", category: "Cryptocurrency" },
  { symbol: "ETH", name: "Ethereum", type: "crypto", price: 3480.10, change24h: 2.15, volume: "$18.1B", category: "Cryptocurrency" },
  { symbol: "SOL", name: "Solana", type: "crypto", price: 154.80, change24h: 6.80, volume: "$5.7B", category: "Cryptocurrency" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", price: 128.50, change24h: 4.25, volume: "$41.2B", category: "Tech Stock" },
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", price: 226.90, change24h: -0.65, volume: "$22.8B", category: "Tech Stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", price: 448.20, change24h: 1.12, volume: "$19.4B", category: "Tech Stock" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", price: 254.30, change24h: -1.84, volume: "$15.6B", category: "Auto & Energy" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", price: 186.75, change24h: 1.45, volume: "$14.3B", category: "E-Commerce & Cloud" },
];

export default function InvestmentsPage() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [assetHoldings, setAssetHoldings] = useState<AssetHolding[]>([]);
  const [assetOrders, setAssetOrders] = useState<AssetOrder[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Plan Invest Modal State
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [investAccountId, setInvestAccountId] = useState<string>("");
  const [investAmount, setInvestAmount] = useState<string>("");
  const [isSubmittingInvest, setIsSubmittingInvest] = useState(false);

  // Early Liquidate Modal
  const [liquidateModalOpen, setLiquidateModalOpen] = useState(false);
  const [selectedInvestToCancel, setSelectedInvestToCancel] = useState<UserInvestment | null>(null);
  const [isLiquidating, setIsLiquidating] = useState(false);

  // Claim Return State
  const [isClaiming, setIsClaiming] = useState<number | null>(null);

  // Trading Modal State (Buy / Sell)
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [tradeAccountId, setTradeAccountId] = useState<string>("");
  const [tradeQuantity, setTradeQuantity] = useState<string>("");
  const [isTrading, setIsTrading] = useState(false);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(2500);
  const [calcPlanId, setCalcPlanId] = useState<number>(1);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      fetchData();
    };
    init();
  }, [router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [plansData, investmentsData, holdingsData, ordersData, accountsData] =
        await Promise.allSettled([
          investmentService.getPlans(),
          investmentService.getUserInvestments(),
          investmentService.getAssetHoldings(),
          investmentService.getAssetOrders(),
          accountService.getAccounts(),
        ]);

      if (plansData.status === "fulfilled") setPlans(plansData.value);
      if (investmentsData.status === "fulfilled") setUserInvestments(investmentsData.value);
      if (holdingsData.status === "fulfilled") setAssetHoldings(holdingsData.value);
      if (ordersData.status === "fulfilled") setAssetOrders(ordersData.value);
      if (accountsData.status === "fulfilled") {
        const accs = (accountsData.value as any[]) || [];
        setAccounts(accs);
        if (accs.length > 0) {
          setInvestAccountId(accs[0].id.toString());
          setTradeAccountId(accs[0].id.toString());
        }
      }
    } catch (err: any) {
      console.error("Error loading investment data:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load investment data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculations for Overview
  const activeTermInvestments = userInvestments.filter((i) => i.status === "active");
  const maturedTermInvestments = userInvestments.filter((i) => i.status === "matured");
  const totalPrincipalInvested = activeTermInvestments.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpectedReturn = activeTermInvestments.reduce((sum, i) => sum + Number(i.expected_return), 0);
  const totalClaimedReturns = userInvestments
    .filter((i) => i.status === "claimed")
    .reduce((sum, i) => sum + Number(i.expected_return), 0);

  // Asset Portfolio Value
  const totalAssetPortfolioValue = assetHoldings.reduce((sum, holding) => {
    const market = MARKET_ASSETS.find((a) => a.symbol === holding.asset_symbol);
    const currentPrice = market ? market.price : Number(holding.average_buy_price);
    return sum + Number(holding.quantity) * currentPrice;
  }, 0);

  const totalAssetInvested = assetHoldings.reduce(
    (sum, holding) => sum + Number(holding.total_invested),
    0
  );
  const assetUnrealizedPnL = totalAssetPortfolioValue - totalAssetInvested;
  const assetUnrealizedPnLPercent =
    totalAssetInvested > 0 ? (assetUnrealizedPnL / totalAssetInvested) * 100 : 0;

  const totalCombinedPortfolio = totalPrincipalInvested + totalAssetPortfolioValue;

  // Plan Investment Handlers
  const handleOpenInvestModal = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setInvestAmount(plan.min_amount.toString());
    setIsInvestModalOpen(true);
  };

  const handleConfirmInvestment = async () => {
    if (!selectedPlan || !investAccountId || !investAmount) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select an account and valid amount.",
      });
      return;
    }

    const amountNum = parseFloat(investAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid investment amount.",
      });
      return;
    }

    if (amountNum < selectedPlan.min_amount) {
      toast({
        variant: "destructive",
        title: "Below Minimum",
        description: `Minimum required investment is $${selectedPlan.min_amount.toLocaleString()}.`,
      });
      return;
    }

    if (amountNum > selectedPlan.max_amount) {
      toast({
        variant: "destructive",
        title: "Exceeds Maximum",
        description: `Maximum allowed investment is $${selectedPlan.max_amount.toLocaleString()}.`,
      });
      return;
    }

    const selectedAcc = accounts.find((a) => a.id.toString() === investAccountId);
    if (selectedAcc && parseFloat(selectedAcc.balance) < amountNum) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `Your account balance is $${parseFloat(selectedAcc.balance).toFixed(2)}.`,
      });
      return;
    }

    try {
      setIsSubmittingInvest(true);
      await investmentService.createInvestment(
        parseInt(investAccountId),
        selectedPlan.id,
        amountNum
      );

      toast({
        title: "Investment Successful! 🎉",
        description: `You invested $${amountNum.toFixed(2)} in ${selectedPlan.name}.`,
      });

      setIsInvestModalOpen(false);
      setInvestAmount("");
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Investment Failed",
        description: err.message || "An error occurred while processing investment.",
      });
    } finally {
      setIsSubmittingInvest(false);
    }
  };

  // Claim Matured Payout
  const handleClaimPayout = async (investment: UserInvestment) => {
    try {
      setIsClaiming(investment.id);
      await investmentService.claimMaturedInvestment(investment.id);
      toast({
        title: "Payout Received! 💰",
        description: `$${investment.total_payout.toFixed(2)} has been credited to your bank account.`,
      });
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Claim Failed",
        description: err.message || "Could not claim payout at this time.",
      });
    } finally {
      setIsClaiming(null);
    }
  };

  // Early Liquidation
  const handleConfirmLiquidation = async () => {
    if (!selectedInvestToCancel) return;
    try {
      setIsLiquidating(true);
      await investmentService.cancelInvestment(selectedInvestToCancel.id);
      toast({
        title: "Investment Liquidated",
        description: `Principal refunded (with 2% liquidation fee) to your account.`,
      });
      setLiquidateModalOpen(false);
      setSelectedInvestToCancel(null);
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Liquidation Failed",
        description: err.message,
      });
    } finally {
      setIsLiquidating(false);
    }
  };

  // Open Trade Modal
  const handleOpenTrade = (asset: MarketAsset, type: "buy" | "sell" = "buy") => {
    setSelectedAsset(asset);
    setTradeType(type);
    setTradeQuantity("1");
    setTradeModalOpen(true);
  };

  // Execute Buy / Sell
  const handleExecuteTrade = async () => {
    if (!selectedAsset || !tradeAccountId || !tradeQuantity) return;
    const qty = parseFloat(tradeQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: "Please enter a valid amount to trade.",
      });
      return;
    }

    try {
      setIsTrading(true);
      const accId = parseInt(tradeAccountId);

      if (tradeType === "buy") {
        await investmentService.buyAsset({
          accountId: accId,
          symbol: selectedAsset.symbol,
          name: selectedAsset.name,
          type: selectedAsset.type,
          quantity: qty,
          pricePerUnit: selectedAsset.price,
        });

        toast({
          title: "Order Executed! 🚀",
          description: `Successfully bought ${qty} ${selectedAsset.symbol} for $${(qty * selectedAsset.price).toFixed(2)}.`,
        });
      } else {
        await investmentService.sellAsset({
          accountId: accId,
          symbol: selectedAsset.symbol,
          quantity: qty,
          pricePerUnit: selectedAsset.price,
        });

        toast({
          title: "Order Executed! 💵",
          description: `Successfully sold ${qty} ${selectedAsset.symbol} for $${(qty * selectedAsset.price).toFixed(2)}.`,
        });
      }

      setTradeModalOpen(false);
      setTradeQuantity("");
      await fetchData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Trade Failed",
        description: err.message || "Failed to execute order.",
      });
    } finally {
      setIsTrading(false);
    }
  };

  // Helpers
  const calcSelectedPlan = plans.find((p) => p.id === calcPlanId) || plans[0];
  const calcEstimatedProfit = calcSelectedPlan
    ? (calcAmount * (calcSelectedPlan.interest_rate / 100) * (calcSelectedPlan.duration_days / 365))
    : 0;

  const calculateDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const calculateProgress = (startDateStr: string, endDateStr: string) => {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.min(100, Math.round(((now - start) / (end - start)) * 100));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-muted-foreground font-medium">Loading your investment portfolio...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Investments & Wealth</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
              <Sparkles className="h-3 w-3 mr-1" /> High-Yield
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Grow your capital with guaranteed term deposit plans and live stock & cryptocurrency asset portfolios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
          </Button>
          <Button
            onClick={() => setActiveTab("plans")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Invest in Plans
          </Button>
        </div>
      </div>

      {/* Top Portfolio KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="relative overflow-hidden border-border/60 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Portfolio Value
            </CardDescription>
            <CardTitle className="text-2xl font-black tracking-tight">
              ${totalCombinedPortfolio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Term Plans + Live Assets</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Locked in Term Plans
            </CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
              ${totalPrincipalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>{activeTermInvestments.length} Active Plan(s)</span>
              <span className="text-emerald-600 font-semibold">+${totalExpectedReturn.toFixed(2)} est.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stocks & Crypto Value
            </CardDescription>
            <CardTitle className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
              ${totalAssetPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs flex items-center justify-between">
              <span className="text-muted-foreground">{assetHoldings.length} Asset Position(s)</span>
              <span className={`font-semibold flex items-center ${assetUnrealizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {assetUnrealizedPnL >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {assetUnrealizedPnL >= 0 ? "+" : ""}{assetUnrealizedPnLPercent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Returns Claimed
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              ${totalClaimedReturns.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Paid into your checking/savings</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md bg-muted/60 p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm flex items-center gap-2">
            <PieChart className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-xs sm:text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Term Plans
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="text-xs sm:text-sm flex items-center gap-2">
            <LineChart className="h-4 w-4" /> Live Market
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        <TabsContent value="overview" className="space-y-6">
          {/* Matured Notifications Banner */}
          {maturedTermInvestments.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">
                    {maturedTermInvestments.length} Matured Investment Ready to Claim!
                  </h4>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    Your investment lockup period has completed. Claim your principal and profits directly to your bank account.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab("plans")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
              >
                View & Claim
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Investments Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Active Term Investments</CardTitle>
                  <CardDescription>Fixed return plans currently compounding</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("plans")}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {activeTermInvestments.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-xl space-y-3">
                    <Shield className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-sm font-medium text-muted-foreground">No active term investments yet.</p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("plans")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      Explore Guaranteed Plans
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTermInvestments.slice(0, 3).map((inv) => {
                      const daysLeft = calculateDaysRemaining(inv.end_date);
                      const progress = calculateProgress(inv.start_date, inv.end_date);
                      return (
                        <div
                          key={inv.id}
                          className="p-4 rounded-xl border bg-card/60 hover:bg-accent/30 transition-colors space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-sm">{inv.plan?.name || "Term Investment"}</h4>
                              <p className="text-xs text-muted-foreground">
                                Invested: ${Number(inv.amount).toLocaleString()} • APY: {inv.plan?.interest_rate || "N/A"}%
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-emerald-600">
                                +${Number(inv.expected_return).toFixed(2)}
                              </span>
                              <p className="text-xs text-muted-foreground">est. return</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>Progress ({progress}%)</span>
                              <span>{daysLeft} days remaining</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Portfolio Asset Holdings Snapshot */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Holdings Snapshot</CardTitle>
                  <CardDescription>Your stocks & crypto assets</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("portfolio")}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  Trade <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {assetHoldings.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-xl space-y-3">
                    <Coins className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-sm font-medium text-muted-foreground">No asset positions held.</p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("portfolio")}
                      variant="outline"
                      className="text-xs"
                    >
                      Browse Market Assets
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assetHoldings.slice(0, 4).map((holding) => {
                      const market = MARKET_ASSETS.find((a) => a.symbol === holding.asset_symbol);
                      const currentPrice = market ? market.price : Number(holding.average_buy_price);
                      const currentVal = Number(holding.quantity) * currentPrice;
                      const profit = currentVal - Number(holding.total_invested);
                      return (
                        <div
                          key={holding.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{holding.asset_symbol}</span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal uppercase">
                                {holding.asset_type}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground">
                              {Number(holding.quantity).toFixed(4)} units
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${currentVal.toFixed(2)}</div>
                            <span className={profit >= 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                              {profit >= 0 ? "+" : ""}${profit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interactive ROI Calculator Section */}
          <Card className="bg-gradient-to-br from-emerald-950/20 via-background to-blue-950/20 border-emerald-500/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Interactive Yield Calculator</CardTitle>
                  <CardDescription>Simulate your prospective returns based on capital & term duration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Select Investment Plan</Label>
                  <Select
                    value={calcPlanId.toString()}
                    onValueChange={(val) => setCalcPlanId(parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.interest_rate}% APY • {p.duration_days}d)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Investment Capital ($)</Label>
                  <Input
                    type="number"
                    min="100"
                    step="100"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="p-4 rounded-xl bg-card border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block">Projected Profit</span>
                    <span className="text-xl font-black text-emerald-600">
                      +${calcEstimatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Total Payout: ${(calcAmount + calcEstimatedProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (calcSelectedPlan) handleOpenInvestModal(calcSelectedPlan);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Invest Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: TERM INVESTMENT PLANS */}
        {/* ========================================================================= */}
        <TabsContent value="plans" className="space-y-8">
          {/* Subscribed Plans (User's active/matured plans) */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" /> My Subscribed Investments
            </h2>

            {userInvestments.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl bg-card/40">
                <p className="text-sm text-muted-foreground">You don&apos;t have any subscribed investments yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose from our curated plans below to lock in guaranteed returns.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userInvestments.map((inv) => {
                  const daysLeft = calculateDaysRemaining(inv.end_date);
                  const progress = calculateProgress(inv.start_date, inv.end_date);
                  const isMatured = (inv.status === "matured" || daysLeft === 0) && inv.status !== "claimed" && inv.status !== "cancelled";

                  return (
                    <Card
                      key={inv.id}
                      className={`border transition-all ${
                        isMatured
                          ? "border-amber-400 bg-amber-50/30 dark:bg-amber-950/20 shadow-md"
                          : ""
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-bold">
                              {inv.plan?.name || "Term Deposit Plan"}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              ID: #{inv.id} • Start: {new Date(inv.start_date).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={
                              inv.status === "claimed"
                                ? "outline"
                                : isMatured
                                ? "default"
                                : inv.status === "cancelled"
                                ? "secondary"
                                : "default"
                            }
                            className={
                              inv.status === "claimed"
                                ? "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40"
                                : isMatured
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }
                          >
                            {inv.status === "claimed"
                              ? "Claimed"
                              : isMatured
                              ? "Matured"
                              : inv.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Invested Capital</span>
                            <span className="font-bold text-sm">${Number(inv.amount).toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground block text-[11px]">Expected Return</span>
                            <span className="font-bold text-sm text-emerald-600">
                              +${Number(inv.expected_return).toFixed(2)}
                            </span>
                          </div>
                          <div className="pt-2 border-t col-span-2 flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">Total Payout</span>
                            <span className="font-black text-sm">${Number(inv.total_payout).toFixed(2)}</span>
                          </div>
                        </div>

                        {inv.status === "active" && !isMatured && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Maturity Progress</span>
                              <span className="font-semibold text-foreground">{daysLeft} days left</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>Matures: {new Date(inv.end_date).toLocaleDateString()}</span>
                              <span>{progress}%</span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pt-1 flex gap-2">
                          {(inv.status === "matured" || (inv.status === "active" && isMatured)) && (
                            <Button
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                              disabled={isClaiming === inv.id}
                              onClick={() => handleClaimPayout(inv)}
                            >
                              {isClaiming === inv.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              )}
                              Claim Payout (${Number(inv.total_payout).toFixed(2)})
                            </Button>
                          )}

                          {inv.status === "active" && !isMatured && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              onClick={() => {
                                setSelectedInvestToCancel(inv);
                                setLiquidateModalOpen(true);
                              }}
                            >
                              Early Liquidate
                            </Button>
                          )}

                          {inv.status === "claimed" && (
                            <div className="w-full text-center py-1 text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Payout credited to balance
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Term Plans Grid */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" /> Available Term Deposit & Staking Plans
              </h2>
              <p className="text-muted-foreground text-xs">
                Select a plan that aligns with your preferred return rate, lockup timeline, and risk profile.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className="flex flex-col justify-between border hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant="outline"
                        className="text-[11px] capitalize font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                      >
                        {plan.category.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant={
                          plan.risk_level === "low"
                            ? "outline"
                            : plan.risk_level === "moderate"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-[10px] capitalize"
                      >
                        {plan.risk_level} Risk
                      </Badge>
                    </div>

                    <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/40 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">Fixed Annual APY</span>
                        <span className="text-2xl font-black text-emerald-600">
                          {plan.interest_rate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                        <span>Lockup Duration</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {plan.duration_days} Days
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Min Deposit:</span>
                        <span className="font-medium text-foreground">${plan.min_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Limit:</span>
                        <span className="font-medium text-foreground">${plan.max_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>

                  <div className="p-6 pt-0">
                    <Button
                      onClick={() => handleOpenInvestModal(plan)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
                    >
                      Invest in Plan
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: LIVE STOCKS & CRYPTO TRADING */}
        {/* ========================================================================= */}
        <TabsContent value="portfolio" className="space-y-8">
          {/* Market Overview */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-purple-600" /> Live Market Assets
                </h2>
                <p className="text-xs text-muted-foreground">
                  Trade fractional shares and tokens instantly using your bank account balance.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {MARKET_ASSETS.map((asset) => (
                <Card key={asset.symbol} className="border hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-black text-xs">
                          {asset.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold">{asset.symbol}</CardTitle>
                          <CardDescription className="text-[11px] truncate">{asset.name}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          asset.change24h >= 0
                            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-[10px]"
                            : "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-[10px]"
                        }
                      >
                        {asset.change24h >= 0 ? "+" : ""}
                        {asset.change24h}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xl font-black">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Volume: {asset.volume}</span>
                      <span className="capitalize">{asset.type}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleOpenTrade(asset, "buy")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      >
                        Buy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenTrade(asset, "sell")}
                        className="text-xs h-8"
                      >
                        Sell
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* User's Asset Positions */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" /> Your Current Asset Positions
            </h2>

            {assetHoldings.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl bg-card/40">
                <p className="text-sm text-muted-foreground">You don&apos;t own any stock or crypto assets currently.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click &apos;Buy&apos; on any asset above to purchase using your bank account funds.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="p-3">Asset</th>
                      <th className="p-3">Holding Units</th>
                      <th className="p-3">Avg Buy Price</th>
                      <th className="p-3">Current Price</th>
                      <th className="p-3">Current Value</th>
                      <th className="p-3">Profit / Loss</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {assetHoldings.map((h) => {
                      const market = MARKET_ASSETS.find((a) => a.symbol === h.asset_symbol);
                      const currentPrice = market ? market.price : Number(h.average_buy_price);
                      const currentVal = Number(h.quantity) * currentPrice;
                      const profit = currentVal - Number(h.total_invested);
                      const profitPct =
                        Number(h.total_invested) > 0 ? (profit / Number(h.total_invested)) * 100 : 0;

                      return (
                        <tr key={h.id} className="hover:bg-muted/20">
                          <td className="p-3">
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{h.asset_symbol}</span>
                              <Badge variant="outline" className="text-[10px] font-normal uppercase">
                                {h.asset_type}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground text-[11px]">{h.asset_name}</span>
                          </td>
                          <td className="p-3 font-semibold">{Number(h.quantity).toFixed(4)}</td>
                          <td className="p-3 text-muted-foreground">${Number(h.average_buy_price).toFixed(2)}</td>
                          <td className="p-3 font-medium">${currentPrice.toFixed(2)}</td>
                          <td className="p-3 font-bold">${currentVal.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={profit >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                              {profit >= 0 ? "+" : ""}${profit.toFixed(2)} ({profitPct.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const m = MARKET_ASSETS.find((a) => a.symbol === h.asset_symbol) || {
                                  symbol: h.asset_symbol,
                                  name: h.asset_name,
                                  type: h.asset_type,
                                  price: Number(h.average_buy_price),
                                  change24h: 0,
                                  volume: "-",
                                  category: "",
                                };
                                handleOpenTrade(m, "buy");
                              }}
                              className="text-xs h-7 px-2"
                            >
                              Buy More
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const m = MARKET_ASSETS.find((a) => a.symbol === h.asset_symbol) || {
                                  symbol: h.asset_symbol,
                                  name: h.asset_name,
                                  type: h.asset_type,
                                  price: Number(h.average_buy_price),
                                  change24h: 0,
                                  volume: "-",
                                  category: "",
                                };
                                handleOpenTrade(m, "sell");
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-7 px-2"
                            >
                              Sell
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trade Order History */}
          {assetOrders.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-lg font-bold">Recent Trade Orders</h2>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Asset</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Execution Price</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assetOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">
                          {new Date(ord.created_at).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={ord.order_type === "buy" ? "default" : "destructive"}
                            className="text-[10px] uppercase font-bold"
                          >
                            {ord.order_type}
                          </Badge>
                        </td>
                        <td className="p-3 font-semibold">{ord.asset_symbol}</td>
                        <td className="p-3">{Number(ord.quantity).toFixed(4)}</td>
                        <td className="p-3">${Number(ord.price_per_unit).toFixed(2)}</td>
                        <td className="p-3 font-bold">${Number(ord.total_amount).toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            {ord.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* DIALOG: INVEST IN TERM PLAN */}
      {/* ========================================================================= */}
      <Dialog open={isInvestModalOpen} onOpenChange={setIsInvestModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Subscribe to {selectedPlan?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lock in a guaranteed return rate of {selectedPlan?.interest_rate}% APY over {selectedPlan?.duration_days} days.
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4 py-2">
              {/* Plan Specs */}
              <div className="p-3 rounded-xl bg-muted/40 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Interest APY</span>
                  <span className="font-bold text-emerald-600 text-sm">{selectedPlan.interest_rate}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Duration</span>
                  <span className="font-bold text-sm">{selectedPlan.duration_days} Days</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Min Deposit</span>
                  <span className="font-medium">${selectedPlan.min_amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Max Deposit</span>
                  <span className="font-medium">${selectedPlan.max_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Source Account */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Fund from Bank Account</Label>
                <Select value={investAccountId} onValueChange={setInvestAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.account_type?.name || "Account"} (****{acc.account_number.slice(-4)}) — Balance: $
                        {parseFloat(acc.balance).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Investment Amount ($)</Label>
                <Input
                  type="number"
                  placeholder={`Min $${selectedPlan.min_amount}`}
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                />
              </div>

              {/* Projected Profit Summary */}
              {parseFloat(investAmount) > 0 && (
                <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Profit:</span>
                    <span className="font-bold text-emerald-600">
                      +$
                      {(
                        parseFloat(investAmount) *
                        (selectedPlan.interest_rate / 100) *
                        (selectedPlan.duration_days / 365)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total Payout at Maturity:</span>
                    <span>
                      $
                      {(
                        parseFloat(investAmount) +
                        parseFloat(investAmount) *
                          (selectedPlan.interest_rate / 100) *
                          (selectedPlan.duration_days / 365)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsInvestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isSubmittingInvest}
              onClick={handleConfirmInvestment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmittingInvest ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Confirm & Invest"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: TRADE ASSET (BUY / SELL) */}
      {/* ========================================================================= */}
      <Dialog open={tradeModalOpen} onOpenChange={setTradeModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {tradeType === "buy" ? (
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-rose-600" />
              )}
              {tradeType === "buy" ? "Buy" : "Sell"} {selectedAsset?.symbol} ({selectedAsset?.name})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Current Market Price: ${selectedAsset?.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4 py-2 text-xs">
              {/* Trade Type Switch */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                <Button
                  type="button"
                  size="sm"
                  variant={tradeType === "buy" ? "default" : "ghost"}
                  onClick={() => setTradeType("buy")}
                  className={tradeType === "buy" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                >
                  Buy {selectedAsset.symbol}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tradeType === "sell" ? "default" : "ghost"}
                  onClick={() => setTradeType("sell")}
                  className={tradeType === "sell" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}
                >
                  Sell {selectedAsset.symbol}
                </Button>
              </div>

              {/* Account Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {tradeType === "buy" ? "Pay From Account" : "Deposit Proceeds Into"}
                </Label>
                <Select value={tradeAccountId} onValueChange={setTradeAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.account_type?.name || "Account"} (****{acc.account_number.slice(-4)}) — $
                        {parseFloat(acc.balance).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Units Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Quantity / Units</Label>
                  {tradeType === "sell" && (
                    <span className="text-[11px] text-muted-foreground">
                      Owned:{" "}
                      {assetHoldings.find((h) => h.asset_symbol === selectedAsset.symbol)?.quantity || 0}{" "}
                      {selectedAsset.symbol}
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.001"
                  min="0.0001"
                  placeholder="Enter units"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(e.target.value)}
                />
              </div>

              {/* Estimated Total */}
              {parseFloat(tradeQuantity) > 0 && (
                <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execution Price:</span>
                    <span>${selectedAsset.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t pt-1">
                    <span>{tradeType === "buy" ? "Total Cost:" : "Total Proceeds:"}</span>
                    <span className={tradeType === "buy" ? "text-emerald-600" : "text-rose-600"}>
                      ${(parseFloat(tradeQuantity) * selectedAsset.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTradeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isTrading}
              onClick={handleExecuteTrade}
              className={
                tradeType === "buy"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  : "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              }
            >
              {isTrading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : tradeType === "buy" ? (
                "Confirm Buy"
              ) : (
                "Confirm Sell"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EARLY LIQUIDATION CONFIRMATION */}
      {/* ========================================================================= */}
      <Dialog open={liquidateModalOpen} onOpenChange={setLiquidateModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              Confirm Early Liquidation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Early liquidation will forfeit accrued profits and applies a 2% processing penalty to your principal.
            </DialogDescription>
          </DialogHeader>

          {selectedInvestToCancel && (
            <div className="p-3 rounded-xl border bg-muted/30 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invested Capital:</span>
                <span className="font-bold">${Number(selectedInvestToCancel.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Early Exit Fee (2%):</span>
                <span>-${(Number(selectedInvestToCancel.amount) * 0.02).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Refunded to Account:</span>
                <span>${(Number(selectedInvestToCancel.amount) * 0.98).toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLiquidateModalOpen(false)}>
              Keep Investment
            </Button>
            <Button
              variant="destructive"
              disabled={isLiquidating}
              onClick={handleConfirmLiquidation}
            >
              {isLiquidating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Liquidate & Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
