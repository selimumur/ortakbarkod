-- Add new columns for detailed product data
alter table arbitrage_watchlist 
add column if not exists attributes jsonb,
add column if not exists images text[];
