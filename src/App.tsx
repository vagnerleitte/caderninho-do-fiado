import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Box,
  Button,
  Chip,
  Card,
  CardActionArea,
  CardContent,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  ThemeProvider,
  Tooltip,
  Toolbar,
  Typography,
  createTheme
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import BackspaceIcon from "@mui/icons-material/Backspace";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type Comanda,
  type Customer,
  type Payment,
  type PaymentMethod,
  type Product,
  type ProductGroup,
  type ProductSubgroup,
  type Sale,
  type SaleItem
} from "./db";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function nowIso(): string {
  return new Date().toISOString();
}

type AmountVisibility = {
  show: boolean;
  toggle: () => void;
  format: (value: number) => string;
};

const AmountVisibilityContext = createContext<AmountVisibility>({
  show: false,
  toggle: () => {},
  format: () => "•••"
});

function useAmountVisibility() {
  return useContext(AmountVisibilityContext);
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

type ComandaTotals = {
  totalConsumption: number;
  totalPaid: number;
  balance: number;
};

async function computeComandaTotals(comandaId: number): Promise<ComandaTotals> {
  const sales = await db.sales.where("comandaId").equals(comandaId).toArray();
  const saleIds = sales.map((sale) => sale.id).filter((id): id is number => Boolean(id));
  const items = saleIds.length
    ? await db.sale_items.where("saleId").anyOf(saleIds).toArray()
    : [];
  const payments = await db.payments.where("comandaId").equals(comandaId).toArray();

  const totalConsumption = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    totalConsumption,
    totalPaid,
    balance: totalConsumption - totalPaid
  };
}

export default function App() {
  const unlockTtlMs = 5 * 60 * 1000;
  const [tab, setTab] = useState(0);
  const [selectedComandaFromHome, setSelectedComandaFromHome] = useState<number | null>(null);
  const [initialSaleProductId, setInitialSaleProductId] = useState<number | null>(null);
  const [showAmounts, setShowAmounts] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("boteco_show_amounts") === "true";
  });
  const [unlockUntil, setUnlockUntil] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("boteco_unlock_until") ?? 0);
  });
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    const until = Number(localStorage.getItem("boteco_unlock_until") ?? 0);
    return Date.now() < until;
  });
  const [pinReady, setPinReady] = useState<boolean | null>(null);
  const [pinError, setPinError] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const pinInputRef = useRef<HTMLInputElement | null>(null);

  const appendPinDigit = (digit: string) => {
    if (pinInput.length >= 6) return;
    setPinInput((prev) => prev + digit);
  };

  const backspacePin = () => {
    setPinInput((prev) => prev.slice(0, -1));
  };
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: { main: "#0f766e" },
          secondary: { main: "#f59e0b" },
          background: { default: "#f8fafc" }
        }
      }),
    []
  );

  const amountVisibility = useMemo<AmountVisibility>(
    () => ({
      show: showAmounts,
      toggle: () => setShowAmounts((prev) => !prev),
      format: (value: number) => (showAmounts ? formatCurrency(value) : "•••")
    }),
    [showAmounts]
  );

  useEffect(() => {
    localStorage.setItem("boteco_show_amounts", String(showAmounts));
  }, [showAmounts]);

  useEffect(() => {
    const stored = localStorage.getItem("boteco_pin_hash");
    setPinReady(Boolean(stored));
  }, []);

  useEffect(() => {
    if (!unlockUntil) return;
    if (Date.now() >= unlockUntil) {
      setIsUnlocked(false);
      localStorage.removeItem("boteco_unlock_until");
      return;
    }
    const timeout = window.setTimeout(() => {
      setIsUnlocked(false);
      localStorage.removeItem("boteco_unlock_until");
    }, unlockUntil - Date.now());
    return () => window.clearTimeout(timeout);
  }, [unlockUntil]);

  useEffect(() => {
    if (pinReady === null || isUnlocked) return;
    window.setTimeout(() => pinInputRef.current?.focus(), 50);
  }, [pinReady, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;
    const refresh = () => {
      const until = Date.now() + unlockTtlMs;
      localStorage.setItem("boteco_unlock_until", String(until));
      setUnlockUntil(until);
    };
    const handler = () => refresh();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, handler, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, handler));
  }, [isUnlocked, unlockTtlMs]);

  const handleSetPin = async () => {
    if (pinInput.length < 4) {
      setPinError("PIN deve ter pelo menos 4 dígitos.");
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError("PINs não conferem.");
      return;
    }
    const hash = await hashPin(pinInput);
    localStorage.setItem("boteco_pin_hash", hash);
    const until = Date.now() + unlockTtlMs;
    localStorage.setItem("boteco_unlock_until", String(until));
    setUnlockUntil(until);
    setPinReady(true);
    setIsUnlocked(true);
    setPinInput("");
    setPinConfirm("");
    setPinError("");
  };

  const handleUnlock = async () => {
    const stored = localStorage.getItem("boteco_pin_hash");
    if (!stored) return;
    const hash = await hashPin(pinInput);
    if (hash !== stored) {
      setPinError("PIN incorreto.");
      return;
    }
    const until = Date.now() + unlockTtlMs;
    localStorage.setItem("boteco_unlock_until", String(until));
    setUnlockUntil(until);
    setIsUnlocked(true);
    setPinInput("");
    setPinError("");
  };

  return (
    <AmountVisibilityContext.Provider value={amountVisibility}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
          <Dialog open={pinReady !== null && !isUnlocked} fullScreen>
            <Box
              sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 3,
                position: "relative",
                overflow: "hidden",
                backgroundColor: "#0f172a",
                "::before": {
                  content: "\"\"",
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "url(/pin-bg.jpg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(4px)",
                  transform: "scale(1.05)"
                },
                "::after": {
                  content: "\"\"",
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(9, 18, 24, 0.85) 100%)"
                }
              }}
            >
              <Box sx={{ position: "relative", zIndex: 1, width: "100%", display: "flex", justifyContent: "center" }}>
              <Card
                sx={{
                  width: "100%",
                  maxWidth: 520,
                  borderRadius: 4,
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(5px)",
                  WebkitBackdropFilter: "blur(5px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.35)",
                  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
                  color: "#f8fafc",
                  ".MuiTypography-root": { color: "#f8fafc" },
                  ".MuiInputLabel-root": { color: "rgba(248, 250, 252, 0.8)" },
                  ".MuiOutlinedInput-input": { color: "#f8fafc" },
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(248, 250, 252, 0.4)" },
                  ".MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(248, 250, 252, 0.7)"
                  },
                  ".MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#f8fafc"
                  }
                }}
              >
                <CardContent>
                  <Stack spacing={2} alignItems="center">
                    <Stack spacing={0.5} textAlign="center">
                      <Typography variant="h6" fontWeight={800} color="text.primary">
                        {pinReady ? "Desbloquear" : "Criar PIN"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pinReady
                          ? "Digite seu PIN para acessar o caderninho."
                          : "Crie um PIN para proteger os dados do boteco."}
                      </Typography>
                    </Stack>
                    <TextField
                      label="PIN"
                      type="password"
                      value={pinInput}
                      onChange={(event) => setPinInput(event.target.value)}
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
                      fullWidth
                      sx={{ maxWidth: 420 }}
                      inputRef={pinInputRef}
                    />
                    <Grid container spacing={1} sx={{ maxWidth: 420, mx: "auto" }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                        <Grid key={digit} item xs={4}>
                          <Button
                            variant="outlined"
                            onClick={() => appendPinDigit(String(digit))}
                            fullWidth
                            sx={{
                              py: 1.5,
                              color: "#ffd76a",
                              borderColor: "rgba(247, 201, 72, 0.6)",
                              backgroundColor: "rgba(247, 201, 72, 0.08)",
                              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                              "&:hover": {
                                borderColor: "#f7c948",
                                backgroundColor: "rgba(247, 201, 72, 0.16)"
                              },
                              textShadow: "0 0 6px rgba(255, 215, 106, 0.55)"
                            }}
                          >
                            {digit}
                          </Button>
                        </Grid>
                      ))}
                      <Grid item xs={4} />
                      <Grid item xs={4}>
                        <Button
                          variant="outlined"
                          onClick={() => appendPinDigit("0")}
                          fullWidth
                          sx={{
                            py: 1.5,
                            color: "#ffd76a",
                            borderColor: "rgba(247, 201, 72, 0.6)",
                            backgroundColor: "rgba(247, 201, 72, 0.08)",
                            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                            "&:hover": {
                              borderColor: "#f7c948",
                              backgroundColor: "rgba(247, 201, 72, 0.16)"
                            },
                            textShadow: "0 0 6px rgba(255, 215, 106, 0.55)"
                          }}
                        >
                          0
                        </Button>
                      </Grid>
                      <Grid item xs={4}>
                        <Button
                          variant="outlined"
                          onClick={backspacePin}
                          fullWidth
                          sx={{
                            py: 1.5,
                            color: "#ffd76a",
                            borderColor: "rgba(247, 201, 72, 0.6)",
                            backgroundColor: "rgba(247, 201, 72, 0.08)",
                            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                            "&:hover": {
                              borderColor: "#f7c948",
                              backgroundColor: "rgba(247, 201, 72, 0.16)"
                            },
                            textShadow: "0 0 6px rgba(255, 215, 106, 0.55)"
                          }}
                        >
                          <BackspaceIcon />
                        </Button>
                      </Grid>
                    </Grid>
                    {!pinReady && (
                      <TextField
                        label="Confirmar PIN"
                        type="password"
                        value={pinConfirm}
                        onChange={(event) => setPinConfirm(event.target.value)}
                        inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
                        fullWidth
                        sx={{ maxWidth: 420 }}
                      />
                    )}
                    {pinError && <Typography color="error" textAlign="center">{pinError}</Typography>}
                    {pinReady ? (
                      <Button
                        variant="contained"
                        onClick={handleUnlock}
                        disabled={pinInput.length < 4}
                        fullWidth
                        sx={{
                          maxWidth: 420,
                          "&.Mui-disabled": {
                            backgroundColor: "rgba(255, 255, 255, 0.25)",
                            color: "rgba(255, 255, 255, 0.7)"
                          }
                        }}
                      >
                        Entrar
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleSetPin}
                        disabled={pinInput.length < 4}
                        fullWidth
                        sx={{
                          maxWidth: 420,
                          "&.Mui-disabled": {
                            backgroundColor: "rgba(255, 255, 255, 0.25)",
                            color: "rgba(255, 255, 255, 0.7)"
                          }
                        }}
                      >
                        Salvar PIN
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
              </Box>
            </Box>
          </Dialog>
          <AppBar position="sticky" color="primary">
            <Toolbar>
              <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
                Caderninho do Boteco
              </Typography>
              <Tooltip title={amountVisibility.show ? "Ocultar valores" : "Mostrar valores"}>
                <IconButton
                  color="inherit"
                  onClick={amountVisibility.toggle}
                  aria-label={amountVisibility.show ? "Ocultar valores" : "Mostrar valores"}
                >
                  {amountVisibility.show ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
              </Tooltip>
            </Toolbar>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          textColor="inherit"
          indicatorColor="secondary"
        >
            <Tab label="Início" />
            <Tab label="Produtos" />
            <Tab label="Clientes" />
            <Tab label="Comandas" />
            <Tab label="Relatórios" />
          </Tabs>
        </AppBar>

        <Container
          sx={{ pt: 2.5, pb: 2, px: { xs: 1, sm: 1.5, md: 2 } }}
          maxWidth="lg"
        >
          {tab === 0 ? (
            <HomeModule
              onOpenComanda={(id) => {
                setSelectedComandaFromHome(id);
                setTab(3);
              }}
              onOpenComandaWithSale={(id, productId) => {
                setSelectedComandaFromHome(id);
                setInitialSaleProductId(productId);
                setTab(3);
              }}
            />
          ) : null}
          {tab === 1 ? <ProductsModule /> : null}
          {tab === 2 ? <CustomersModule /> : null}
          {tab === 3 ? (
            <ComandasModule
              initialOpenComandaId={selectedComandaFromHome}
              initialSaleProductId={initialSaleProductId}
              onOpenedFromHome={() => {
                setSelectedComandaFromHome(null);
                setInitialSaleProductId(null);
              }}
            />
          ) : null}
          {tab === 4 ? <ReportsModule /> : null}
        </Container>
        </Box>
      </ThemeProvider>
    </AmountVisibilityContext.Provider>
  );
}

function ProductsModule() {
  const { format } = useAmountVisibility();
  const groups = useLiveQuery(() => db.product_groups.toArray(), []);
  const subgroups = useLiveQuery(() => db.product_subgroups.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);

  const [groupFilter, setGroupFilter] = useState<number>(0);
  const [subgroupFilter, setSubgroupFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState("name-asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    const saved = localStorage.getItem("boteco_products_view");
    return saved === "grid" ? "grid" : "list";
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const groupMap = useMemo(() => {
    const map = new Map<number, ProductGroup>();
    (groups ?? []).forEach((group) => {
      if (group.id) map.set(group.id, group);
    });
    return map;
  }, [groups]);

  const subgroupMap = useMemo(() => {
    const map = new Map<number, ProductSubgroup>();
    (subgroups ?? []).forEach((subgroup) => {
      if (subgroup.id) map.set(subgroup.id, subgroup);
    });
    return map;
  }, [subgroups]);

  const availableSubgroups = useMemo(() => {
    if (!groupFilter) return [];
    return (subgroups ?? []).filter((subgroup) => subgroup.groupId === groupFilter);
  }, [subgroups, groupFilter]);

  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = list.filter((product) => {
      if (normalizedSearch && !product.name.toLowerCase().includes(normalizedSearch)) return false;
      if (groupFilter && product.groupId !== groupFilter) return false;
      if (!groupFilter) return true;
      if (!subgroupFilter) return true;
      if (subgroupFilter === -1) return !product.subgroupId;
      return product.subgroupId === subgroupFilter;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.unitPrice - b.unitPrice;
        case "price-desc":
          return b.unitPrice - a.unitPrice;
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [products, groupFilter, subgroupFilter, sortBy, searchTerm]);

  const handleOpenNew = () => {
    setEditingId(null);
    setOpen(true);
  };

  const handleEdit = (id: number) => {
    setEditingId(id);
    setOpen(true);
  };

  useEffect(() => {
    localStorage.setItem("boteco_products_view", viewMode);
  }, [viewMode]);

  return (
    <Box>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <FormControl fullWidth size="small">
            <InputLabel id="group-filter">Categoria</InputLabel>
            <Select
              labelId="group-filter"
              value={groupFilter}
              label="Categoria"
              onChange={(event) => {
                const value = Number(event.target.value);
                setGroupFilter(value);
                setSubgroupFilter(0);
              }}
            >
              <MenuItem value={0}>Todas</MenuItem>
              {(groups ?? []).map((group) => (
                <MenuItem key={group.id} value={group.id ?? 0}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" disabled={!groupFilter}>
            <InputLabel id="subgroup-filter">Subcategoria</InputLabel>
            <Select
              labelId="subgroup-filter"
              value={subgroupFilter}
              label="Subcategoria"
              onChange={(event) => setSubgroupFilter(Number(event.target.value))}
            >
              <MenuItem value={0}>Todas</MenuItem>
              <MenuItem value={-1}>Sem subgrupo</MenuItem>
              {availableSubgroups.map((subgroup) => (
                <MenuItem key={subgroup.id} value={subgroup.id ?? 0}>
                  {subgroup.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="sort-products">Ordenar</InputLabel>
            <Select
              labelId="sort-products"
              value={sortBy}
              label="Ordenar"
              onChange={(event) => setSortBy(String(event.target.value))}
            >
              <MenuItem value="name-asc">Nome (A-Z)</MenuItem>
              <MenuItem value="name-desc">Nome (Z-A)</MenuItem>
              <MenuItem value="price-asc">Menor preço</MenuItem>
              <MenuItem value="price-desc">Maior preço</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Buscar produto"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => {
                if (value) setViewMode(value);
              }}
              size="small"
            >
              <ToggleButton value="list" aria-label="Lista detalhada">
                <ViewListIcon />
              </ToggleButton>
              <ToggleButton value="grid" aria-label="Grid">
                <GridViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" onClick={handleOpenNew}>
              Novo
            </Button>
          </Stack>
        </Stack>

        {viewMode === "list" ? (
          <List sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
            {filteredProducts.length === 0 ? (
              <ListItem>
                <ListItemText primary="Nenhum produto cadastrado." />
              </ListItem>
            ) : (
              filteredProducts.map((product) => (
                <ListItem key={product.id} divider disablePadding>
                  <ListItemButton
                    sx={{ alignItems: "flex-start" }}
                    onClick={() => product.id && handleEdit(product.id)}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {product.imageUrl ? (
                            <Box
                              component="img"
                              src={product.imageUrl}
                              alt={product.name}
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                objectFit: "cover",
                                flexShrink: 0,
                                bgcolor: "#e2e8f0"
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                bgcolor: "#e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                color: "#0f172a",
                                flexShrink: 0
                              }}
                            >
                              {product.name.slice(0, 2).toUpperCase()}
                            </Box>
                          )}
                          <Stack spacing={0.2}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {product.name}
                            </Typography>
                            <Typography variant="subtitle1" color="text.secondary">
                              {format(product.unitPrice)}
                            </Typography>
                          </Stack>
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                          <Chip label={groupMap.get(product.groupId)?.name ?? "Grupo"} size="small" />
                          {product.subgroupId ? (
                            <Chip
                              label={subgroupMap.get(product.subgroupId)?.name ?? "Subgrupo"}
                              size="small"
                            />
                          ) : (
                            <Chip label="Sem subgrupo" size="small" variant="outlined" />
                          )}
                          {product.sellsFractioned && (
                            <Chip label="Fracionado" size="small" color="success" />
                          )}
                          {!product.active && (
                            <Chip label="Inativo" size="small" color="warning" />
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        ) : (
          <Grid container spacing={2}>
            {filteredProducts.length === 0 ? (
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
                  <CardContent>
                    <Typography>Nenhum produto cadastrado.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              filteredProducts.map((product) => (
                <Grid key={product.id} item xs={12} sm={6} md={4}>
                  <Card sx={{ borderRadius: 2, boxShadow: 1, height: "100%" }}>
                    <CardActionArea
                      sx={{ height: "100%", alignItems: "stretch" }}
                      onClick={() => product.id && handleEdit(product.id)}
                    >
                      <Stack sx={{ height: "100%" }}>
                        {product.imageUrl ? (
                          <Box
                            component="img"
                            src={product.imageUrl}
                            alt={product.name}
                            sx={{
                              width: "100%",
                              height: 140,
                              objectFit: "cover",
                              borderTopLeftRadius: 8,
                              borderTopRightRadius: 8,
                              bgcolor: "#e2e8f0"
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: "100%",
                              height: 140,
                              bgcolor: "#e2e8f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              color: "#0f172a"
                            }}
                          >
                            {product.name.slice(0, 2).toUpperCase()}
                          </Box>
                        )}
                        <CardContent>
                          <Stack spacing={1}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {product.name}
                            </Typography>
                            <Typography variant="subtitle2" color="text.secondary">
                              {format(product.unitPrice)}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                              <Chip label={groupMap.get(product.groupId)?.name ?? "Grupo"} size="small" />
                              {product.subgroupId ? (
                                <Chip
                                  label={subgroupMap.get(product.subgroupId)?.name ?? "Subgrupo"}
                                  size="small"
                                />
                              ) : (
                                <Chip label="Sem subgrupo" size="small" variant="outlined" />
                              )}
                              {product.sellsFractioned && (
                                <Chip label="Fracionado" size="small" color="success" />
                              )}
                              {!product.active && (
                                <Chip label="Inativo" size="small" color="warning" />
                              )}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Stack>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Stack>

      <ProductDialog
        open={open}
        onClose={() => setOpen(false)}
        groups={groups ?? []}
        subgroups={subgroups ?? []}
        editingId={editingId}
      />
    </Box>
  );
}

function ProductDialog({
  open,
  onClose,
  groups,
  subgroups,
  editingId
}: {
  open: boolean;
  onClose: () => void;
  groups: ProductGroup[];
  subgroups: ProductSubgroup[];
  editingId: number | null;
}) {
  const editingProduct = useLiveQuery(
    () => (editingId ? db.products.get(editingId) : undefined),
    [editingId]
  );

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<number>(0);
  const [subgroupId, setSubgroupId] = useState<number | null>(null);
  const [unitPrice, setUnitPrice] = useState("0");
  const [sellsFractioned, setSellsFractioned] = useState(false);
  const [active, setActive] = useState(true);

  const resetForm = (product?: Product) => {
    if (product) {
      setName(product.name);
      setGroupId(product.groupId);
      setSubgroupId(product.subgroupId ?? null);
      setUnitPrice(String(product.unitPrice));
      setSellsFractioned(product.sellsFractioned);
      setActive(product.active);
      return;
    }

    setName("");
    setGroupId(groups[0]?.id ?? 0);
    setSubgroupId(null);
    setUnitPrice("0");
    setSellsFractioned(false);
    setActive(true);
  };

  const availableSubgroups = useMemo(() => {
    return subgroups.filter((subgroup) => subgroup.groupId === groupId);
  }, [subgroups, groupId]);

  const isValid =
    name.trim().length > 0 &&
    groupId > 0 &&
    unitPrice.trim() !== "" &&
    !Number.isNaN(Number(unitPrice));

  const handleSave = async () => {
    if (!isValid) return;
    const payload: Product = {
      name: name.trim(),
      groupId,
      subgroupId: subgroupId ?? null,
      unitPrice: Number(unitPrice),
      sellsFractioned,
      active
    };

    if (editingId) {
      await db.products.update(editingId, payload);
    } else {
      await db.products.add(payload);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const ok = window.confirm("Excluir este produto?");
    if (!ok) return;
    await db.products.delete(editingId);
    onClose();
  };

  const title = editingId ? "Editar produto" : "Novo produto";

  useEffect(() => {
    if (!open) return;
    resetForm(editingProduct);
  }, [open, editingProduct]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="product-group">Grupo</InputLabel>
            <Select
              labelId="product-group"
              value={groupId}
              label="Grupo"
              onChange={(event) => {
                const value = Number(event.target.value);
                setGroupId(value);
                setSubgroupId(null);
              }}
              required
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id ?? 0}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="product-subgroup">Subgrupo</InputLabel>
            <Select
              labelId="product-subgroup"
              value={subgroupId ?? -1}
              label="Subgrupo"
              onChange={(event) => {
                const value = Number(event.target.value);
                setSubgroupId(value === -1 ? null : value);
              }}
            >
              <MenuItem value={-1}>Sem subgrupo</MenuItem>
              {availableSubgroups.map((subgroup) => (
                <MenuItem key={subgroup.id} value={subgroup.id ?? 0}>
                  {subgroup.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Preço unitário"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            type="number"
            inputProps={{ min: 0, step: "0.01" }}
            required
            fullWidth
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography>Vende fracionado</Typography>
            <Switch checked={sellsFractioned} onChange={(event) => setSellsFractioned(event.target.checked)} />
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography>Ativo</Typography>
            <Switch checked={active} onChange={(event) => setActive(event.target.checked)} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {editingId && (
          <Button color="error" onClick={handleDelete}>
            Excluir
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function HomeModule({
  onOpenComanda,
  onOpenComandaWithSale
}: {
  onOpenComanda: (id: number) => void;
  onOpenComandaWithSale: (id: number, productId: number) => void;
}) {
  const { format } = useAmountVisibility();
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);
  const favoriteProducts = useLiveQuery(async () => {
    const list = await db.products.toArray();
    return list.filter((product) => product.favorite);
  }, []);
  const openComandas = useLiveQuery(
    () =>
      db.transaction("r", db.comandas, db.sales, db.sale_items, db.payments, async () => {
        const list = await db.comandas
          .where("status")
          .equals("OPEN")
          .filter((comanda) => comanda.customerId !== null)
          .toArray();
        const withTotals = await Promise.all(
          list.map(async (comanda) => ({
            comanda,
            totals: comanda.id
              ? await computeComandaTotals(comanda.id)
              : { totalConsumption: 0, totalPaid: 0, balance: 0 }
          }))
        );
        return withTotals;
      }),
    []
  );

  const frequentCustomers = useLiveQuery(async () => {
    const [allCustomers, allComandas] = await Promise.all([
      db.customers.toArray(),
      db.comandas.toArray()
    ]);
    const counts = new Map<number, number>();
    allComandas.forEach((comanda) => {
      if (!comanda.customerId) return;
      counts.set(comanda.customerId, (counts.get(comanda.customerId) ?? 0) + 1);
    });
    return allCustomers
      .filter((customer) => customer.id && counts.has(customer.id))
      .map((customer) => ({
        customer,
        count: counts.get(customer.id as number) ?? 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, []);

  const favoriteCustomers = useLiveQuery(async () => {
    const list = await db.customers.toArray();
    return list.filter((customer) => customer.favorite);
  }, []);
  const topProducts = useLiveQuery(async () => {
    const [items, products] = await Promise.all([
      db.sale_items.toArray(),
      db.products.toArray()
    ]);
    const productMap = new Map<number, Product>();
    products.forEach((product) => {
      if (product.id) productMap.set(product.id, product);
    });
    const totals = new Map<number, number>();
    items.forEach((item) => {
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
    });
    return Array.from(totals.entries())
      .map(([productId, quantity]) => ({
        product: productMap.get(productId),
        quantity
      }))
      .filter((entry): entry is { product: Product; quantity: number } => Boolean(entry.product))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 12);
  }, []);

  const favoriteCategories = useMemo(() => {
    const order = [
      "Cervejas",
      "Destilados",
      "Não alcoólicos",
      "Snacks salgados",
      "Salgados rápidos",
      "Doces de balcão",
      "Extras de conveniência"
    ];
    const categoryByName = (product: Product) => {
      const name = product.name.toLowerCase();
      if (name.includes("cerveja") || name.includes("skol") || name.includes("brahma") || name.includes("antarctica") || name.includes("itaipava") || name.includes("heineken")) {
        return "Cervejas";
      }
      if (name.includes("dose") || name.includes("whisky") || name.includes("vodka") || name.includes("conhaque") || name.includes("corote")) {
        return "Destilados";
      }
      if (name.includes("coca") || name.includes("guaran") || name.includes("água") || name.includes("suco")) {
        return "Não alcoólicos";
      }
      if (name.includes("amendoim") || name.includes("batata frita") || name.includes("calabresa") || name.includes("frango") || name.includes("torresmo")) {
        return "Snacks salgados";
      }
      if (name.includes("pastel") || name.includes("coxinha") || name.includes("espetinho") || name.includes("hambúrguer")) {
        return "Salgados rápidos";
      }
      if (name.includes("bala") || name.includes("chiclete") || name.includes("paçoca") || name.includes("chocolate") || name.includes("picolé")) {
        return "Doces de balcão";
      }
      return "Extras de conveniência";
    };
    const map = new Map<string, Product[]>();
    (favoriteProducts ?? []).forEach((product) => {
      const category = categoryByName(product);
      if (!map.has(category)) map.set(category, []);
      map.get(category)?.push(product);
    });
    return order
      .map((name) => ({ name, products: map.get(name) ?? [] }))
      .filter((category) => category.products.length > 0);
  }, [favoriteProducts]);

  const handleQuickSaleClick = (productName: string) => {
    const product = productByName.get(productName.toLowerCase());
    if (!product?.id) {
      window.alert("Produto não encontrado no catálogo. Cadastre primeiro.");
      return;
    }
    setQuickSaleProductId(product.id);
    setQuickSaleCustomerId(null);
    setQuickSaleDialogOpen(true);
  };
  const [openQuickComanda, setOpenQuickComanda] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [openNewCustomer, setOpenNewCustomer] = useState(false);
  const [quickSaleDialogOpen, setQuickSaleDialogOpen] = useState(false);
  const [quickSaleProductId, setQuickSaleProductId] = useState<number | null>(null);
  const [quickSaleCustomerId, setQuickSaleCustomerId] = useState<number | null>(null);
  const [quickSaleComandaId, setQuickSaleComandaId] = useState<number | null>(null);
  const [openQuickSaleForm, setOpenQuickSaleForm] = useState(false);
  const [openQuickSalePayment, setOpenQuickSalePayment] = useState(false);
  const [quickSaleDueAmount, setQuickSaleDueAmount] = useState(0);
  const [quickSalePendingPayment, setQuickSalePendingPayment] = useState(false);
  const [quickSaleCustomerSearch, setQuickSaleCustomerSearch] = useState("");
  const [homeProductSearch, setHomeProductSearch] = useState("");

  const handleOpenCustomerComanda = async (customerId?: number) => {
    if (!customerId) return;
    const existing = await db.comandas
      .where("status")
      .equals("OPEN")
      .and((comanda) => comanda.customerId === customerId)
      .first();
    if (existing?.id) {
      onOpenComanda(existing.id);
      return;
    }
    const id = await db.comandas.add({
      customerId,
      openedAt: nowIso(),
      closedAt: null,
      status: "OPEN"
    });
    onOpenComanda(id);
  };

  const filteredCustomers = useMemo(() => {
    const term = searchCustomer.trim().toLowerCase();
    if (!term) return [];
    return (customers ?? []).filter((customer) => customer.name.toLowerCase().includes(term));
  }, [customers, searchCustomer]);

  const customerMap = useMemo(() => {
    const map = new Map<number, Customer>();
    (customers ?? []).forEach((customer) => {
      if (customer.id) map.set(customer.id, customer);
    });
    return map;
  }, [customers]);

  const productByName = useMemo(() => {
    const map = new Map<string, Product>();
    (products ?? []).forEach((product) => {
      if (!product.id) return;
      map.set(product.name.toLowerCase(), product);
    });
    return map;
  }, [products]);

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: { xs: "block", md: "grid" },
          gridTemplateColumns: { md: "1fr 2fr" },
          gap: { xs: 2, md: 2 },
          alignItems: "start"
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack spacing={1} alignItems="flex-start">
            <Button
              variant="contained"
              onClick={() => setOpenQuickComanda(true)}
              sx={{ width: 62, height: 62, minWidth: 62, borderRadius: 2 }}
              aria-label="Abrir comanda"
            >
              <AddIcon fontSize="medium" />
            </Button>
            <Typography variant="caption" color="text.secondary">
              Abrir comanda
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle1" fontWeight={700}>
              Comandas abertas
            </Typography>
            {(openComandas ?? []).length === 0 ? (
              <Typography color="text.secondary">Nenhuma comanda aberta no momento.</Typography>
            ) : (
              <Grid container spacing={0.5}>
                {(openComandas ?? []).slice(0, 6).map(({ comanda, totals }) => (
                  <Grid key={comanda.id} item xs={6}>
                    <Card sx={{ bgcolor: "#fff" }}>
                      <CardActionArea onClick={() => comanda.id && onOpenComanda(comanda.id)}>
                        <CardContent>
                          <Stack spacing={0.5}>
                            <Typography fontWeight={700}>
                              {comanda.customerId
                                ? customerMap.get(comanda.customerId)?.name ?? "Cliente"
                                : "Cliente"}
                            </Typography>
                            <Typography
                              fontWeight={700}
                              color={totals.balance > 0 ? "warning.main" : "success.main"}
                            >
                              {format(totals.balance)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Stack>
        </Box>
      </Box>

      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={700}>
          Clientes em destaque
        </Typography>
        {((favoriteCustomers ?? []).length === 0 && (frequentCustomers ?? []).length === 0) ? (
          <Typography color="text.secondary">Sem clientes em destaque ainda.</Typography>
        ) : (
          <Grid container spacing={0.5}>
            {(() => {
              const favorites = (favoriteCustomers ?? []).map((customer) => ({
                customer,
                isFavorite: true,
                count: null
              }));
              const favoriteIds = new Set(favorites.map((item) => item.customer.id));
              const recurring = (frequentCustomers ?? [])
                .filter((item) => item.customer.id && !favoriteIds.has(item.customer.id))
                .map((item) => ({
                  customer: item.customer,
                  isFavorite: false,
                  count: item.count
                }));
              return [...favorites, ...recurring].slice(0, 6);
            })().map((item) => (
              <Grid key={item.customer.id} item xs={6}>
                <Card sx={{ bgcolor: "#fff" }}>
                  <CardActionArea onClick={() => handleOpenCustomerComanda(item.customer.id)}>
                    <CardContent>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600}>{item.customer.name}</Typography>
                        {item.isFavorite ? (
                          <FavoriteIcon color="error" fontSize="small" />
                        ) : (
                          <Chip label={`${item.count ?? 0} comandas`} size="small" />
                        )}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

        <Box sx={{ minWidth: 0 }}>
          <Stack spacing={1}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Produtos em destaque
              </Typography>
              <TextField
                size="small"
                label="Buscar produto"
                value={homeProductSearch}
                onChange={(event) => setHomeProductSearch(event.target.value)}
                sx={{ minWidth: { sm: 220 } }}
              />
            </Stack>
            {(() => {
              const term = homeProductSearch.trim().toLowerCase();
              const sold = (topProducts ?? []).map((item) => ({
                product: item.product,
                label: `Saída: ${item.quantity}`
              }));
              const soldIds = new Set(sold.map((item) => item.product.id));
              const favoritesFlat = favoriteCategories.flatMap((category) =>
                category.products.map((product) => ({
                  product,
                  label: format(product.unitPrice)
                }))
              );
              const merged = [
                ...favoritesFlat,
                ...sold.filter((item) => !favoritesFlat.some((fav) => fav.product.id === item.product.id))
              ];

              const baseList =
                term.length > 0
                  ? (products ?? [])
                      .filter((product) => product.name.toLowerCase().includes(term))
                      .map((product) => ({
                        product,
                        label: format(product.unitPrice)
                      }))
                  : merged;

              const sortedList =
                term.length > 0
                  ? baseList
                  : [
                      ...baseList.filter((item) => item.product.favorite),
                      ...baseList.filter((item) => !item.product.favorite)
                    ];

              if (sortedList.length === 0) {
                return <Typography color="text.secondary">Sem produtos para exibir.</Typography>;
              }
              return (
                <Grid container spacing={0.5}>
                  {sortedList.map((item) => (
                    <Grid key={item.product.id} item xs={6} sm={4} lg={3}>
                      <Card
                        sx={{
                          bgcolor: "#fff",
                          width: "94%",
                          border: item.product.favorite ? "1px solid #2f855a" : "1px solid transparent",
                          boxShadow: item.product.favorite ? 2 : 1
                        }}
                      >
                        <CardActionArea onClick={() => handleQuickSaleClick(item.product.name)}>
                          <CardContent sx={{ p: 1 }}>
                            <Stack spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {item.product.imageUrl ? (
                                  <Box
                                    component="img"
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    sx={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: 1,
                                      objectFit: "cover",
                                      flexShrink: 0,
                                      bgcolor: "#e2e8f0"
                                    }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: 1,
                                      bgcolor: "#e2e8f0",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 700,
                                      color: "#0f172a",
                                      flexShrink: 0
                                    }}
                                  >
                                    {item.product.name.slice(0, 2).toUpperCase()}
                                  </Box>
                                )}
                                <Typography fontWeight={600} noWrap sx={{ flexGrow: 1 }}>
                                  {item.product.name}
                                </Typography>
                                {item.product.favorite && (
                                  <Chip
                                    label="Favorito"
                                    size="small"
                                    color="success"
                                    sx={{ height: 22 }}
                                  />
                                )}
                                <IconButton
                                  size="small"
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    if (!item.product.id) return;
                                    await db.products.update(item.product.id, {
                                      favorite: !item.product.favorite
                                    });
                                  }}
                                  aria-label={
                                    item.product.favorite ? "Remover favorito" : "Marcar favorito"
                                  }
                                >
                                  {item.product.favorite ? (
                                    <FavoriteIcon color="error" fontSize="small" />
                                  ) : (
                                    <FavoriteBorderIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Stack>
                              <Chip label={item.label} size="small" />
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              );
            })()}
          </Stack>
        </Box>
      <Dialog open={openQuickComanda} onClose={() => setOpenQuickComanda(false)} fullWidth maxWidth="sm">
        <DialogTitle>Abrir comanda</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Buscar cliente"
              value={searchCustomer}
              onChange={(event) => setSearchCustomer(event.target.value)}
              size="small"
            />
            <Button variant="outlined" onClick={() => setOpenNewCustomer(true)}>
              Novo cliente
            </Button>

            {searchCustomer.trim() === "" && (favoriteCustomers ?? []).length > 0 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Favoritos
                </Typography>
                <Grid container spacing={1}>
                  {(favoriteCustomers ?? []).map((customer) => (
                    <Grid key={customer.id} item xs={6}>
                      <Card sx={{ bgcolor: "#fff" }}>
                        <CardActionArea
                          onClick={async () => {
                            await handleOpenCustomerComanda(customer.id);
                            setOpenQuickComanda(false);
                          }}
                        >
                          <CardContent>
                            <Stack spacing={0.5}>
                              <Typography fontWeight={600}>{customer.name}</Typography>
                              <FavoriteIcon color="error" fontSize="small" />
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )}

            {searchCustomer.trim() === "" && (frequentCustomers ?? []).length > 0 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recorrentes
                </Typography>
                <Grid container spacing={1}>
                  {(frequentCustomers ?? []).map((item) => (
                    <Grid key={item.customer.id} item xs={6}>
                      <Card sx={{ bgcolor: "#fff" }}>
                        <CardActionArea
                          onClick={async () => {
                            await handleOpenCustomerComanda(item.customer.id);
                            setOpenQuickComanda(false);
                          }}
                        >
                          <CardContent>
                            <Stack spacing={0.5}>
                              <Typography fontWeight={600}>{item.customer.name}</Typography>
                              <Chip label={`${item.count} comandas`} size="small" />
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )}

            {filteredCustomers.length > 0 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Resultados
                </Typography>
                <List sx={{ bgcolor: "#fff", borderRadius: 2, boxShadow: 1 }}>
                  {filteredCustomers.map((customer) => (
                    <ListItem key={customer.id} divider disablePadding>
                      <ListItemButton
                        onClick={async () => {
                          await handleOpenCustomerComanda(customer.id);
                          setOpenQuickComanda(false);
                        }}
                      >
                        <ListItemText primary={customer.name} secondary={customer.phone ?? ""} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenQuickComanda(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <QuickCustomerDialog
        open={openNewCustomer}
        onClose={() => setOpenNewCustomer(false)}
        onCreated={async (id) => {
          await handleOpenCustomerComanda(id);
          setOpenNewCustomer(false);
          setOpenQuickComanda(false);
        }}
      />

      <Dialog open={quickSaleDialogOpen} onClose={() => setQuickSaleDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar venda rápida</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              Produto selecionado:{" "}
              <strong>
                {quickSaleProductId
                  ? products?.find((p) => p.id === quickSaleProductId)?.name ?? "Produto"
                  : "Produto"}
              </strong>
            </Typography>
            <TextField
              label="Buscar cliente"
              value={quickSaleCustomerSearch}
              onChange={(event) => setQuickSaleCustomerSearch(event.target.value)}
              size="small"
            />
            <FormControl fullWidth>
              <InputLabel id="quick-sale-customer">Cliente (opcional)</InputLabel>
              <Select
                labelId="quick-sale-customer"
                value={quickSaleCustomerId ?? ""}
                label="Cliente (opcional)"
                onChange={(event) => setQuickSaleCustomerId(Number(event.target.value) || null)}
              >
                {(customers ?? [])
                  .filter((customer) =>
                    quickSaleCustomerSearch.trim() === ""
                      ? true
                      : customer.name.toLowerCase().includes(quickSaleCustomerSearch.trim().toLowerCase())
                  )
                  .map((customer) => (
                    <MenuItem key={customer.id} value={customer.id ?? 0}>
                      {customer.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              Se selecionar um cliente, a venda será registrada na comanda dele.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setQuickSaleDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="outlined"
            onClick={async () => {
              if (!quickSaleProductId) return;
              const now = nowIso();
              const comandaId = await db.comandas.add({
                customerId: null,
                openedAt: now,
                closedAt: null,
                status: "OPEN",
                notes: "Venda avulsa"
              });
              setQuickSaleComandaId(comandaId);
              setQuickSalePendingPayment(false);
              setOpenQuickSaleForm(true);
              setQuickSaleDialogOpen(false);
            }}
          >
            Venda avulsa
          </Button>
          <Button
            variant="contained"
            disabled={!quickSaleCustomerId}
            onClick={async () => {
              if (!quickSaleCustomerId || !quickSaleProductId) return;
              const existing = await db.comandas
                .where("status")
                .equals("OPEN")
                .and((comanda) => comanda.customerId === quickSaleCustomerId)
                .first();
              const comandaId = existing?.id
                ? existing.id
                : await db.comandas.add({
                    customerId: quickSaleCustomerId,
                    openedAt: nowIso(),
                    closedAt: null,
                    status: "OPEN"
                  });
              setQuickSaleDialogOpen(false);
              onOpenComandaWithSale(comandaId, quickSaleProductId);
            }}
          >
            Ir para comanda
          </Button>
        </DialogActions>
      </Dialog>

      <AddSaleDialog
        open={openQuickSaleForm}
        onClose={() => {
          setOpenQuickSaleForm(false);
          if (!quickSalePendingPayment && quickSaleComandaId) {
            db.comandas.delete(quickSaleComandaId);
            setQuickSaleComandaId(null);
          }
        }}
        comandaId={quickSaleComandaId ?? 0}
        initialProductId={quickSaleProductId ?? undefined}
        onSaved={(saleTotal) => {
          setQuickSaleDueAmount(saleTotal);
          setQuickSalePendingPayment(true);
          setOpenQuickSalePayment(true);
        }}
      />

      <AddPaymentDialog
        open={openQuickSalePayment}
        onClose={() => {
          setOpenQuickSalePayment(false);
          setQuickSaleDueAmount(0);
          setQuickSalePendingPayment(false);
          setQuickSaleComandaId(null);
        }}
        comandaId={quickSaleComandaId ?? 0}
        dueAmount={quickSaleDueAmount}
        initialAmount={quickSaleDueAmount}
        onSaved={async (amount) => {
          if (!quickSaleComandaId) return;
          if (amount >= quickSaleDueAmount) {
            await db.comandas.update(quickSaleComandaId, {
              status: "CLOSED",
              closedAt: nowIso()
            });
          }
          setOpenQuickSalePayment(false);
          setQuickSaleDueAmount(0);
          setQuickSalePendingPayment(false);
          setQuickSaleComandaId(null);
        }}
      />
    </Stack>
  );
}

function QuickCustomerDialog({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setNotes("");
  }, [open]);

  const isValid = name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    const id = await db.customers.add({
      name: name.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined
    });
    onCreated(id);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Novo cliente</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Telefone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            fullWidth
          />
          <TextField
            label="Observações"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReportsModule() {
  const { format } = useAmountVisibility();
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  const report = useLiveQuery(async () => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);

    const salesToday = await db.sales
      .filter((sale) => {
        const createdAt = new Date(sale.createdAt);
        return createdAt >= start && createdAt <= end;
      })
      .toArray();

    const saleIds = salesToday.map((sale) => sale.id).filter((id): id is number => Boolean(id));
    const saleItems = saleIds.length
      ? await db.sale_items.where("saleId").anyOf(saleIds).toArray()
      : [];

    const paymentsToday = await db.payments
      .filter((payment) => {
        const createdAt = new Date(payment.createdAt);
        return createdAt >= start && createdAt <= end;
      })
      .toArray();

    const consumptionTotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const paymentsTotal = paymentsToday.reduce((sum, payment) => sum + payment.amount, 0);

    const paymentsByMethod = paymentsToday.reduce(
      (acc, payment) => {
        acc[payment.method] = (acc[payment.method] ?? 0) + payment.amount;
        return acc;
      },
      {} as Record<PaymentMethod, number>
    );

    return {
      consumptionTotal,
      paymentsTotal,
      balance: consumptionTotal - paymentsTotal,
      paymentsByMethod,
      salesCount: salesToday.length,
      itemsCount: saleItems.length
    };
  }, [startDate, endDate]);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" fontWeight={700}>
        Vendas no período
      </Typography>

      <Card sx={{ bgcolor: "#fff" }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Início"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Fim"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  const now = new Date();
                  const today = now.toISOString().slice(0, 10);
                  setStartDate(today);
                  setEndDate(today);
                }}
              >
                Hoje
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const now = new Date();
                  const end = now.toISOString().slice(0, 10);
                  const start = new Date(now);
                  start.setDate(start.getDate() - 6);
                  setStartDate(start.toISOString().slice(0, 10));
                  setEndDate(end);
                }}
              >
                7 dias
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const now = new Date();
                  const end = now.toISOString().slice(0, 10);
                  const start = new Date(now);
                  start.setDate(start.getDate() - 29);
                  setStartDate(start.toISOString().slice(0, 10));
                  setEndDate(end);
                }}
              >
                30 dias
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: "#fff" }}>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Consumo no período</Typography>
              <Typography fontWeight={700}>{format(report?.consumptionTotal ?? 0)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Pagamentos no período</Typography>
              <Typography fontWeight={700}>{format(report?.paymentsTotal ?? 0)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Em aberto no período (fiado)</Typography>
              <Typography fontWeight={700} color={(report?.balance ?? 0) > 0 ? "warning.main" : "success.main"}>
                {format(report?.balance ?? 0)}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: "#fff" }}>
        <CardContent>
          <Typography fontWeight={700} sx={{ mb: 1 }}>
            Pagamentos por forma
          </Typography>
          <Stack spacing={0.5}>
            {(["PIX", "CASH", "CARD"] as PaymentMethod[]).map((method) => (
              <Stack key={method} direction="row" justifyContent="space-between">
                <Typography color="text.secondary">{method}</Typography>
                <Typography fontWeight={600}>
                  {format(report?.paymentsByMethod?.[method] ?? 0)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: "#fff" }}>
        <CardContent>
          <Typography fontWeight={700} sx={{ mb: 1 }}>
            Volume do dia
          </Typography>
          <Stack direction="row" spacing={2}>
            <Chip label={`${report?.salesCount ?? 0} vendas`} />
            <Chip label={`${report?.itemsCount ?? 0} itens`} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function CustomersModule() {
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const filteredCustomers = useMemo(() => {
    const list = customers ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((customer) => customer.name.toLowerCase().includes(term));
  }, [customers, search]);

  return (
    <Box>
      <Stack spacing={2}>
        <TextField
          label="Buscar por nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
        />
        <Button
          variant="contained"
          onClick={() => {
            setEditingId(null);
            setOpen(true);
          }}
        >
          Novo
        </Button>

        <List sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
          {filteredCustomers.length === 0 ? (
            <ListItem>
              <ListItemText primary="Nenhum cliente cadastrado." />
            </ListItem>
          ) : (
            filteredCustomers.map((customer) => (
              <ListItem
                key={customer.id}
                divider
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="Favorito"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (!customer.id) return;
                      await db.customers.update(customer.id, { favorite: !customer.favorite });
                    }}
                  >
                    {customer.favorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                  </IconButton>
                }
              >
                <ListItemButton onClick={() => customer.id && setEditingId(customer.id)}>
                  <ListItemText primary={customer.name} secondary={customer.phone ?? ""} />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Stack>

      <CustomerDialog
        open={open || editingId !== null}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
        }}
        editingId={editingId}
      />
    </Box>
  );
}

function CustomerDialog({
  open,
  onClose,
  editingId
}: {
  open: boolean;
  onClose: () => void;
  editingId: number | null;
}) {
  const editingCustomer = useLiveQuery(
    () => (editingId ? db.customers.get(editingId) : undefined),
    [editingId]
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [favorite, setFavorite] = useState(false);

  const resetForm = (customer?: Customer) => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone ?? "");
      setNotes(customer.notes ?? "");
      setFavorite(Boolean(customer.favorite));
      return;
    }
    setName("");
    setPhone("");
    setNotes("");
    setFavorite(false);
  };

  const isValid = name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    const payload: Customer = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      favorite
    };

    if (editingId) {
      await db.customers.update(editingId, payload);
    } else {
      await db.customers.add(payload);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const ok = window.confirm("Excluir este cliente?");
    if (!ok) return;
    await db.customers.delete(editingId);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    resetForm(editingCustomer);
  }, [open, editingCustomer]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editingId ? "Editar cliente" : "Novo cliente"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Telefone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            fullWidth
          />
          <TextField
            label="Observações"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography>Favorito</Typography>
            <Switch checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {editingId && (
          <Button color="error" onClick={handleDelete}>
            Excluir
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ComandasModule({
  initialOpenComandaId,
  initialSaleProductId,
  onOpenedFromHome
}: {
  initialOpenComandaId: number | null;
  initialSaleProductId: number | null;
  onOpenedFromHome: () => void;
}) {
  const { format } = useAmountVisibility();
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const comandas = useLiveQuery(
    () =>
      db.transaction("r", db.comandas, db.sales, db.sale_items, db.payments, async () => {
        const list = await db.comandas.orderBy("openedAt").reverse().toArray();
        const withTotals = await Promise.all(
          list.map(async (comanda) => ({
            comanda,
            totals: comanda.id
              ? await computeComandaTotals(comanda.id)
              : { totalConsumption: 0, totalPaid: 0, balance: 0 }
          }))
        );
        return withTotals;
      }),
    []
  );

  const openComandas = (comandas ?? []).filter(
    (item) => item.comanda.status === "OPEN" && item.comanda.customerId !== null
  );
  const [openNew, setOpenNew] = useState(false);
  const [selectedComandaId, setSelectedComandaId] = useState<number | null>(null);

  useEffect(() => {
    if (!initialOpenComandaId) return;
    setSelectedComandaId(initialOpenComandaId);
    onOpenedFromHome();
  }, [initialOpenComandaId, onOpenedFromHome]);

  const customerMap = useMemo(() => {
    const map = new Map<number, Customer>();
    (customers ?? []).forEach((customer) => {
      if (customer.id) map.set(customer.id, customer);
    });
    return map;
  }, [customers]);

  return (
    <Box>
      <Stack spacing={2}>
        <Button variant="contained" onClick={() => setOpenNew(true)}>
          Nova Comanda
        </Button>
        <List sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
          {openComandas.length === 0 ? (
            <ListItem>
              <ListItemText primary="Nenhuma comanda aberta." />
            </ListItem>
          ) : (
            openComandas.map(({ comanda, totals }) => (
              <ListItem key={comanda.id} divider disablePadding>
                <ListItemButton onClick={() => comanda.id && setSelectedComandaId(comanda.id)}>
                  <ListItemText
                    primary={
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600}>
                          {comanda.customerId ? customerMap.get(comanda.customerId)?.name ?? "Cliente" : "Cliente"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Aberta em {formatDateTime(comanda.openedAt)}
                        </Typography>
                      </Stack>
                    }
                    primaryTypographyProps={{ component: "div" }}
                    secondary={
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                        <Chip label={`Consumo: ${format(totals.totalConsumption)}`} size="small" />
                        <Chip label={`Pago: ${format(totals.totalPaid)}`} size="small" color="success" />
                        <Chip
                          label={`Saldo devedor: ${format(totals.balance)}`}
                          size="small"
                          color={totals.balance > 0 ? "error" : "success"}
                        />
                      </Stack>
                    }
                    secondaryTypographyProps={{ component: "div" }}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Stack>

      <NewComandaDialog
        open={openNew}
        customers={customers ?? []}
        onClose={() => setOpenNew(false)}
        onOpenExisting={(id) => setSelectedComandaId(id)}
      />

      <ComandaDetails
        comandaId={selectedComandaId}
        onClose={() => setSelectedComandaId(null)}
        customerMap={customerMap}
        initialProductId={initialSaleProductId}
      />
    </Box>
  );
}

function NewComandaDialog({
  open,
  customers,
  onClose,
  onOpenExisting
}: {
  open: boolean;
  customers: Customer[];
  onClose: () => void;
  onOpenExisting: (id: number) => void;
}) {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setCustomerId(null);
    setNotes("");
  }, [open]);

  const canCreate = customerId !== null;

  const handleCreate = async () => {
    if (customerId === null) return;
    const existing = await db.comandas
      .where("status")
      .equals("OPEN")
      .and((comanda) => comanda.customerId === customerId)
      .first();
    if (existing?.id) {
      window.alert("Já existe comanda aberta para este cliente.");
      onClose();
      onOpenExisting(existing.id);
      return;
    }

    const id = await db.comandas.add({
      customerId,
      openedAt: nowIso(),
      closedAt: null,
      status: "OPEN",
      notes: notes.trim() || undefined
    });
    onClose();
    onOpenExisting(id);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nova comanda</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="comanda-customer">Cliente</InputLabel>
            <Select
              labelId="comanda-customer"
              value={customerId ?? ""}
              label="Cliente"
              onChange={(event) => {
                const value = Number(event.target.value);
                setCustomerId(Number.isNaN(value) ? null : value);
              }}
            >
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id ?? 0}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Observações"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!canCreate}>
          Abrir
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ComandaDetails({
  comandaId,
  onClose,
  customerMap,
  initialProductId
}: {
  comandaId: number | null;
  onClose: () => void;
  customerMap: Map<number, Customer>;
  initialProductId?: number | null;
}) {
  const { format, show, toggle } = useAmountVisibility();
  const comanda = useLiveQuery(
    () => (comandaId ? db.comandas.get(comandaId) : undefined),
    [comandaId]
  );

  const totals = useLiveQuery(
    () =>
      comandaId
        ? db.transaction("r", db.sales, db.sale_items, db.payments, () => computeComandaTotals(comandaId))
        : Promise.resolve({ totalConsumption: 0, totalPaid: 0, balance: 0 }),
    [comandaId]
  );

  const sales = useLiveQuery(
    () => (comandaId ? db.sales.where("comandaId").equals(comandaId).reverse().toArray() : []),
    [comandaId]
  );

  const saleItems = useLiveQuery(
    async () => {
      if (!sales) return [];
      const saleIds = sales.map((sale) => sale.id).filter((id): id is number => Boolean(id));
      return saleIds.length ? db.sale_items.where("saleId").anyOf(saleIds).toArray() : [];
    },
    [sales]
  );

  const products = useLiveQuery(() => db.products.toArray(), []);
  const payments = useLiveQuery(
    () => (comandaId ? db.payments.where("comandaId").equals(comandaId).reverse().toArray() : []),
    [comandaId]
  );

  const [openSale, setOpenSale] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [prefillProductId, setPrefillProductId] = useState<number | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    (products ?? []).forEach((product) => {
      if (product.id) map.set(product.id, product);
    });
    return map;
  }, [products]);

  const itemsBySale = useMemo(() => {
    const map = new Map<number, SaleItem[]>();
    (saleItems ?? []).forEach((item) => {
      if (!map.has(item.saleId)) map.set(item.saleId, []);
      map.get(item.saleId)?.push(item);
    });
    return map;
  }, [saleItems]);

  useEffect(() => {
    if (!initialProductId) return;
    setPrefillProductId(initialProductId);
    setOpenSale(true);
  }, [initialProductId]);

  useEffect(() => {
    if (!comandaId) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [comandaId, onClose]);

  if (!comandaId || !comanda) return null;

  const customerName = comanda.customerId
    ? customerMap.get(comanda.customerId)?.name ?? "Cliente"
    : "Cliente";

  const balance = totals?.balance ?? 0;

  const handleCloseComanda = async () => {
    if (balance > 0) {
      window.alert("A comanda só pode ser fechada com saldo quitado.");
      return;
    }
    await db.comandas.update(comandaId, { status: "CLOSED", closedAt: nowIso() });
    onClose();
  };

  return (
    <Dialog open={Boolean(comandaId)} onClose={onClose} fullScreen>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{customerName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {comanda.status === "OPEN" ? "Aberta" : "Fechada"} em {formatDateTime(comanda.openedAt)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pressione Esc para voltar
            </Typography>
          </Box>
          <Tooltip title={show ? "Ocultar valores" : "Mostrar valores"}>
            <IconButton
              color="inherit"
              onClick={toggle}
              aria-label={show ? "Ocultar valores" : "Mostrar valores"}
            >
              {show ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Fechar (Esc)">
            <IconButton color="inherit" onClick={onClose} aria-label="Fechar">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Typography variant="subtitle1" fontWeight={600}>
              Totais
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip label={`Consumo: ${format(totals?.totalConsumption ?? 0)}`} />
              <Chip color="success" label={`Pago: ${format(totals?.totalPaid ?? 0)}`} />
              <Chip
                color={balance > 0 ? "warning" : "success"}
                label={`Saldo: ${format(balance)}`}
              />
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight={600}>
                Vendas
              </Typography>
              <Button variant="contained" onClick={() => setOpenSale(true)} disabled={comanda.status !== "OPEN"}>
                Registrar venda
              </Button>
            </Stack>
            {sales && sales.length > 0 ? (
              sales.map((sale) => (
                <Accordion key={sale.id} sx={{ bgcolor: "#fff" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{formatDateTime(sale.createdAt)}</Typography>
                      {sale.notes ? (
                        <Typography variant="body2" color="text.secondary">
                          {sale.notes}
                        </Typography>
                      ) : null}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      {(itemsBySale.get(sale.id ?? -1) ?? []).map((item) => (
                        <Stack
                          key={item.id}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography>
                            {productMap.get(item.productId)?.name ?? "Produto"} × {item.quantity}
                          </Typography>
                          <Typography color="text.secondary">{format(item.subtotal)}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography color="text.secondary">Nenhuma venda registrada.</Typography>
            )}
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight={600}>
                Pagamentos
              </Typography>
              <Button variant="contained" onClick={() => setOpenPayment(true)} disabled={comanda.status !== "OPEN"}>
                Adicionar pagamento
              </Button>
            </Stack>
            {payments && payments.length > 0 ? (
              payments.map((payment) => (
                <Stack
                  key={payment.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ bgcolor: "#fff", p: 1.5, borderRadius: 1 }}
                >
                  <Stack>
                    <Typography fontWeight={600}>{payment.method}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTime(payment.createdAt)} {payment.notes ? `• ${payment.notes}` : ""}
                    </Typography>
                  </Stack>
                  <Typography>{format(payment.amount)}</Typography>
                </Stack>
              ))
            ) : (
              <Typography color="text.secondary">Nenhum pagamento lançado.</Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Voltar (Esc)</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={handleCloseComanda}
          disabled={comanda.status !== "OPEN" || balance > 0}
        >
          Fechar comanda
        </Button>
      </DialogActions>

      <AddSaleDialog
        open={openSale}
        onClose={() => setOpenSale(false)}
        comandaId={comandaId}
        initialProductId={prefillProductId ?? undefined}
      />
      <AddPaymentDialog
        open={openPayment}
        onClose={() => setOpenPayment(false)}
        comandaId={comandaId}
        dueAmount={balance}
      />
    </Dialog>
  );
}

function AddSaleDialog({
  open,
  onClose,
  comandaId,
  initialProductId,
  onSaved
}: {
  open: boolean;
  onClose: () => void;
  comandaId: number;
  initialProductId?: number;
  onSaved?: (saleTotal: number) => void;
}) {
  const { format } = useAmountVisibility();
  const groups = useLiveQuery(() => db.product_groups.toArray(), []);
  const products = useLiveQuery(async () => {
    const list = await db.products.toArray();
    return list.filter((product) => product.active);
  }, []);
  const [items, setItems] = useState<Record<number, { quantity: number; unitPrice: string }>>({});
  const [notes, setNotes] = useState("");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedQty, setSelectedQty] = useState(0);
  const [selectedPrice, setSelectedPrice] = useState("0");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!open) return;
    setItems({});
    setNotes("");
    setSaleDate(new Date().toISOString().slice(0, 10));
    setSelectedProductId(initialProductId ?? null);
    setSelectedQty(0);
    setSelectedPrice("0");
    setSearchTerm("");
  }, [open, initialProductId]);

  const updateItem = (product: Product, quantity: number, unitPrice?: string) => {
    setItems((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[product.id ?? 0];
        return next;
      }
      next[product.id ?? 0] = {
        quantity,
        unitPrice: unitPrice ?? prev[product.id ?? 0]?.unitPrice ?? String(product.unitPrice)
      };
      return next;
    });
  };

  const itemsList = useMemo(() => {
    return Object.entries(items)
      .map(([productId, data]) => ({ productId: Number(productId), ...data }))
      .filter((item) => item.quantity > 0 && !Number.isNaN(Number(item.unitPrice)));
  }, [items]);

  const selectedProduct = useMemo(
    () => (products ?? []).find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const productsByGroup = useMemo(() => {
    const map = new Map<number, Product[]>();
    const normalizedSearch = searchTerm.trim().toLowerCase();
    (products ?? [])
      .filter((product) =>
        normalizedSearch ? product.name.toLowerCase().includes(normalizedSearch) : true
      )
      .forEach((product) => {
      const key = product.groupId ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(product);
    });
    return map;
  }, [products, searchTerm]);

  useEffect(() => {
    if (!selectedProduct) return;
    const current = items[selectedProduct.id ?? 0];
    setSelectedQty(current?.quantity ?? 0);
    setSelectedPrice(String(current?.unitPrice ?? selectedProduct.unitPrice));
  }, [selectedProduct, items]);

  const saleTotal = itemsList.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice), 0);

  const handleSave = async () => {
    if (itemsList.length === 0) return;
    const now = new Date();
    const selected = new Date(`${saleDate}T${now.toTimeString().slice(0, 8)}`);
    if (selected > now) return;
    const saleId = await db.sales.add({
      comandaId,
      createdAt: selected.toISOString(),
      paymentMethod: "CASH",
      notes: notes.trim() || undefined
    });

    const saleItems: SaleItem[] = itemsList.map((item) => ({
      saleId,
      productId: item.productId,
      quantity: item.quantity,
      unitPriceAtTime: Number(item.unitPrice),
      subtotal: item.quantity * Number(item.unitPrice)
    }));

    await db.sale_items.bulkAdd(saleItems);
    onSaved?.(saleTotal);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Registrar venda</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Observações"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            fullWidth
          />
          <TextField
            label="Data da venda"
            type="date"
            value={saleDate}
            onChange={(event) => setSaleDate(event.target.value)}
            inputProps={{ max: new Date().toISOString().slice(0, 10) }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Produtos por categoria
            </Typography>
            {!selectedProduct && (
              <TextField
                label="Buscar produto"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                fullWidth
              />
            )}
            {selectedProduct ? (
              <Card sx={{ bgcolor: "#fff" }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={700}>{selectedProduct.name}</Typography>
                      <Typography color="text.secondary">
                        Categoria: {(groups ?? []).find((g) => g.id === selectedProduct.groupId)?.name ?? "Categoria"}
                      </Typography>
                      <Typography color="text.secondary">Preço: {format(Number(selectedPrice))}</Typography>
                    </Stack>

                    <Stack spacing={1}>
                      <Typography fontWeight={600}>Quantidade</Typography>
                      <Typography variant="h5">{selectedQty}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {[1, 2, 6, 12].map((step) => (
                          <Button
                            key={step}
                            variant="outlined"
                            onClick={() => setSelectedQty((prev) => prev + step)}
                          >
                            +{step}
                          </Button>
                        ))}
                        <Button variant="text" color="error" onClick={() => setSelectedQty(0)}>
                          Limpar
                        </Button>
                      </Stack>
                    </Stack>

                    <TextField
                      label="Preço"
                      type="number"
                      size="small"
                      value={selectedPrice}
                      onChange={(event) => setSelectedPrice(event.target.value)}
                      inputProps={{ min: 0, step: "0.01" }}
                      fullWidth
                    />

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (!selectedProduct.id || selectedQty <= 0) return;
                          updateItem(selectedProduct, selectedQty, selectedPrice);
                        }}
                      >
                        Adicionar
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setSelectedProductId(null);
                        }}
                      >
                        Continuar
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              (groups ?? []).map((group) => {
                const list = productsByGroup.get(group.id ?? 0) ?? [];
                if (list.length === 0) return null;
                return (
                  <Stack key={group.id} spacing={1}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {group.name}
                    </Typography>
                    <Grid container spacing={1}>
                      {list.map((product) => (
                        <Grid key={product.id} item xs={4}>
                          <Card sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                            <CardActionArea onClick={() => setSelectedProductId(product.id ?? null)}>
                              <Box
                                sx={{
                                  height: 72,
                                  bgcolor: "#e2e8f0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  color: "#0f172a"
                                }}
                              >
                                {product.name.slice(0, 2).toUpperCase()}
                              </Box>
                              <CardContent sx={{ py: 1 }}>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                  {product.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {format(product.unitPrice)}
                                </Typography>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                );
              })
            )}
          </Stack>

          {selectedProduct && (
            <Card sx={{ bgcolor: "#fff" }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography fontWeight={700}>{selectedProduct.name}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="Qtd"
                      type="number"
                      size="small"
                      value={String(selectedQty)}
                      onChange={(event) => setSelectedQty(Number(event.target.value) || 0)}
                      inputProps={{ min: 1, step: "1", style: { width: 88 } }}
                    />
                    <TextField
                      label="Preço"
                      type="number"
                      size="small"
                      value={selectedPrice}
                      onChange={(event) => setSelectedPrice(event.target.value)}
                      inputProps={{ min: 0, step: "0.01", style: { width: 110 } }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (!selectedProduct.id || Number.isNaN(selectedQty) || selectedQty <= 0) return;
                        updateItem(selectedProduct, selectedQty, selectedPrice);
                      }}
                    >
                      Adicionar
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {itemsList.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Itens adicionados
              </Typography>
              <List sx={{ bgcolor: "#fff", borderRadius: 2, boxShadow: 1 }}>
                {itemsList.map((item) => (
                  <ListItem
                    key={item.productId}
                    divider
                    secondaryAction={
                      <Button
                        color="error"
                        onClick={() => {
                          const product = (products ?? []).find((p) => p.id === item.productId);
                          if (product) updateItem(product, 0);
                        }}
                      >
                        Remover
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`${(products ?? []).find((p) => p.id === item.productId)?.name ?? "Produto"}`}
                      secondary={`${item.quantity} × ${format(Number(item.unitPrice))} = ${format(item.quantity * Number(item.unitPrice))}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>
          )}

          <Stack direction="row" justifyContent="space-between">
            <Typography fontWeight={600}>Total da venda</Typography>
            <Typography fontWeight={600}>{format(saleTotal)}</Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={itemsList.length === 0}>
          Salvar venda
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AddPaymentDialog({
  open,
  onClose,
  comandaId,
  dueAmount,
  initialAmount,
  onSaved
}: {
  open: boolean;
  onClose: () => void;
  comandaId: number;
  dueAmount?: number;
  initialAmount?: number;
  onSaved?: (amount: number) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [amount, setAmount] = useState("0");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setMethod("PIX");
    setAmount(initialAmount ? String(initialAmount) : "0");
    setNotes("");
  }, [open, initialAmount]);

  const isValid = amount.trim() !== "" && !Number.isNaN(Number(amount)) && Number(amount) > 0;
  const remaining = typeof dueAmount === "number" ? Math.max(dueAmount - (Number(amount) || 0), 0) : null;

  const handleSave = async () => {
    if (!isValid) return;
    const payload: Payment = {
      comandaId,
      createdAt: nowIso(),
      method,
      amount: Number(amount),
      notes: notes.trim() || undefined
    };
    await db.payments.add(payload);
    onSaved?.(payload.amount);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Adicionar pagamento</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {typeof dueAmount === "number" && (
            <Card sx={{ bgcolor: "#fff" }}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary">Total devido</Typography>
                      <Typography fontWeight={700}>{formatCurrency(dueAmount)}</Typography>
                    </Stack>
                  {remaining !== null && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography color="text.secondary">Saldo remanescente</Typography>
                      <Typography fontWeight={700}>{formatCurrency(remaining)}</Typography>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
          <FormControl fullWidth>
            <InputLabel id="payment-method">Forma</InputLabel>
            <Select
              labelId="payment-method"
              value={method}
              label="Forma"
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            >
              <MenuItem value="PIX">PIX</MenuItem>
              <MenuItem value="CASH">Dinheiro</MenuItem>
              <MenuItem value="CARD">Cartão</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Valor"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            inputProps={{ min: 0, step: "0.01" }}
            required
            fullWidth
          />
          <TextField
            label="Observações"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
