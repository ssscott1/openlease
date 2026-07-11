-- Term range settles at 9–24 months (reverting the 36-month ceiling).
update public.pricing_config
set term_max_months = 24,
    term_multipliers = term_multipliers - '36';
