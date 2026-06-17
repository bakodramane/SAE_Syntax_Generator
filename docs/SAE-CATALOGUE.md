# SAE Method Catalogue — Authoritative Reference

This document is the statistical source of truth for the SAE Syntax Generator.
Claude Code must treat every field value here as authoritative when seeding `src/catalogue/`.
The user (a statistician) will maintain and extend this file over time.

---

## §1 Template token conventions

Use these tokens consistently across all R and Stata templates:

| Token | Meaning |
|---|---|
| `{{TARGET_VAR}}` | Name of the target (outcome) variable |
| `{{AREA_ID}}` | Name of the small area identifier variable |
| `{{AUX_VARS_R}}` | Auxiliary variables as R formula terms, e.g. `x1 + x2` |
| `{{AUX_VARS_R_VEC}}` | Auxiliary variable names as a quoted R character vector, e.g. `"x1", "x2"` — for column-selection contexts such as `c({{AUX_VARS_R_VEC}})` |
| `{{AUX_VARS_STATA}}` | Auxiliary variables space-separated, e.g. `x1 x2` |
| `{{AUX_VAR_VARIANCES_R}}` | Auxiliary sampling-variance column names as a quoted R character vector, e.g. `"var_x1", "var_x2"` |
| `{{CI_ARRAY_BUILDER_R}}` | Generated R code assembling the per-domain measurement-error variance–covariance array `Ci` from the variance columns |
| `{{WEIGHT_VAR}}` | Sampling weight variable name |
| `{{DIRECT_EST_VAR}}` | Pre-computed direct estimate column |
| `{{DIRECT_VAR_VAR}}` | Sampling variance of the direct estimate |
| `{{SURVEY_DATA}}` | File path for survey microdata (default `"survey.csv"`) |
| `{{CENSUS_DATA}}` | File path for census/population auxiliaries (default `"census.csv"`) |
| `{{AREA_DATA}}` | File path for area-level aggregated data (default `"area_data.csv"`) |
| `{{CONTIG_MATRIX}}` | File path for contiguity / spatial weights matrix |
| `{{N_SIM}}` | Number of bootstrap/Monte Carlo simulations (default 200) |
| `{{MSE_METHOD}}` | `"bootstrap"` or `"analytic"` |

---

## §2 Method taxonomy

### Level and inference type
- **Area-level:** Auxiliary information available only as area aggregates. Does not require
  microdata. Input is the vector of direct estimates plus their known sampling variances.
- **Unit-level:** Requires survey microdata classified by area, plus population-level auxiliaries
  (either unit-level from census, or area-level means/totals).
- **Model-assisted:** Design-based, uses microdata and survey weights; auxiliary variables
  improve efficiency but the estimator is still design-consistent.

### MSE methods
- **Prasad–Rao analytic:** Second-order unbiased, fast, standard for FH and BHF.
- **Parametric bootstrap:** Simulation-based; more flexible; required for EBP/ELL/non-linear.
- **Posterior variance:** Bayesian analogue; from the MCMC posterior distribution.

---

## §3 Recommender logic

The recommender must apply these rules in order. The first rule that applies to a situation
takes precedence for ranking; lower rank = more appropriate.

| Situation | Primary methods (rank 1–3) | Notes |
|---|---|---|
| Only area aggregates available (no microdata) | FH-EBLUP (1), Spatial-FH (2 if spatial), HB-FH (3) | Direct is always last |
| Microdata + continuous target, no spatial, no outliers | BHF-EBLUP (1), EBP/CensusEB (2), M-quantile (3) | |
| Microdata + continuous target + outlier flag | M-quantile (1), REBLUP (2), MQGWR (3 if spatial) | Warn against standard EBLUP |
| Microdata + continuous target + spatial flag | Spatial-FH if area-level (1), MQGWR (2), BHF-SEBLUP (3) | |
| Target is poverty/inequality/non-linear | EBP/CensusEB (1), ELL (2), FH on arcsine-transformed direct (3, area-level fallback) | Require census auxiliaries |
| Binary or proportion target | GLMM-binary (1), Arcsine-FH (2, area-level), HB-unit binomial (3) | |
| Count target, no excess zeros | GLMM-count Poisson (1), HB-unit Poisson (2) | |
| Count target with excess zeros likely | Two-part/ZI (1), GLMM-count (2) | |
| Survey weights present, no census microdata | GREG (1 if area-level aux available), Pseudo-EBLUP (2) | Weighted EBP if census available |
| Out-of-sample areas present | EBP (1), FH (2) | Flag: out-of-sample uses synthetic predictor; model assumptions are critical |
| Sparse data (very small ni per area) | HB-FH or HB-unit (1) | Bayesian exact inference; flag MCMC computation time |
| Area aggregates only + binary/proportion target | Arcsine-transformed FH (1), HB-FH binomial (2) | |

**Always include the direct estimator** as the final entry in every recommendation set,
with the note: "Use as a benchmark to validate model-based estimates."

---

## §4 All 16 method entries

### 4.01 Direct estimator

```
id:              direct
displayName:     Direct Estimator (Design-Based Benchmark)
level:           model-assisted
inferenceType:   design-based
targetTypes:     [continuous, binary, proportion, count]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   none
  weights:             true
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       prasad-rao
rPackage:        survey
rFunction:       svyby / svymean
stataPackage:    base
stataCommand:    svy: mean
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  Estimates the area mean or total directly from sample observations within each area
  using survey design weights. No auxiliary data or modelling assumptions are required.
  Precision is low when area sample sizes are small — this is why SAE methods are needed.
whyChooseThis: |
  Use this as a benchmark to check whether model-based estimates are reasonable.
  If your sample sizes are large enough (ni ≥ 25 per area), direct estimates may be
  sufficient on their own.
assumptions:
  - Sample sizes within each area are large enough for reliable direct estimation.
  - Survey weights correctly reflect the sampling design.
references:
  - Kish, L. (1965). Survey Sampling. Wiley.
  - Cochran, W.G. (1977). Sampling Techniques, 3rd ed. Wiley.
```

**R template:**
```r
# ============================================================
# Direct Estimator — Design-Based Benchmark
# Generated by SAE Syntax Generator on {{DATE}}
# Survey data: {{SURVEY_DATA}}
# ============================================================

# Install required packages if not already installed
if (!requireNamespace("survey", quietly = TRUE)) install.packages("survey")
library(survey)

# Load survey microdata
survey_data <- read.csv("{{SURVEY_DATA}}")

# Define the survey design (adjust strata/cluster/fpc as appropriate)
design <- svydesign(
  ids   = ~1,                        # replace ~1 with cluster variable if clustered
  weights = ~{{WEIGHT_VAR}},
  data  = survey_data
)

# Compute direct estimates by small area
direct_estimates <- svyby(
  formula = ~{{TARGET_VAR}},
  by      = ~{{AREA_ID}},
  design  = design,
  FUN     = svymean,
  keep.var = TRUE
)

print(direct_estimates)

# NOTE: SE column gives the standard error; CV = SE / estimate.
# Areas with CV > 0.25 typically warrant model-based SAE methods.
```

**Stata template (v14+):**
```stata
* ============================================================
* Direct Estimator — Design-Based Benchmark
* Generated by SAE Syntax Generator on {{DATE}}
* Survey data: {{SURVEY_DATA}}
* ============================================================

use "{{SURVEY_DATA}}", clear

* Declare survey design (adjust psu/strata as appropriate)
svyset [pweight = {{WEIGHT_VAR}}]

* Direct estimates by small area
svy: mean {{TARGET_VAR}}, over({{AREA_ID}})

* Coefficient of variation: CV > 0.25 suggests SAE methods are needed
```

---

### 4.02 GREG (Generalised Regression Estimator)

```
id:              greg
displayName:     GREG — Generalised Regression Estimator
level:           model-assisted
inferenceType:   design-based
targetTypes:     [continuous, binary, proportion, count]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             true
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       prasad-rao
rPackage:        survey / JoSAE
rFunction:       svyglm / eblup.mse.f.wrap
stataPackage:    base
stataCommand:    svy: regress
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  A model-assisted estimator that uses a regression model fitted to the survey microdata,
  calibrated so that estimates remain design-consistent. Improves on the direct estimator
  when auxiliary variables are correlated with the target. Area-level means of auxiliaries
  must be known for the whole population.
whyChooseThis: |
  A good first step beyond direct estimation. Requires only area-level auxiliary totals/means
  (not full census microdata) and remains design-unbiased even if the model is wrong.
assumptions:
  - Regression model is approximately correctly specified.
  - Area-level population means of auxiliary variables are known without error.
  - Survey weights are correct.
references:
  - Rao, J.N.K. & Molina, I. (2015). Small Area Estimation, 2nd ed. Wiley. Ch. 3.
  - FAO (2015). Spatial Disaggregation and SAE Methods for Agricultural Surveys. Ch. 2.3.
```

**R template:**
```r
# ============================================================
# GREG — Generalised Regression Estimator
# Generated by SAE Syntax Generator on {{DATE}}
# Survey data:    {{SURVEY_DATA}}
# Area-level data: {{AREA_DATA}}
# ============================================================

if (!requireNamespace("survey", quietly = TRUE)) install.packages("survey")
library(survey)

survey_data <- read.csv("{{SURVEY_DATA}}")
area_data   <- read.csv("{{AREA_DATA}}")   # must contain AREA_ID + auxiliary population means

design <- svydesign(ids = ~1, weights = ~{{WEIGHT_VAR}}, data = survey_data)

# Fit regression model
greg_model <- svyglm({{TARGET_VAR}} ~ {{AUX_VARS_R}}, design = design)

# GREG estimate per area (calibration approach)
# Area-level calibration requires the population means in area_data
# See Rao & Molina (2015) Ch. 3 for the manual calibration formula
# or use the JoSAE package eblup.mse.f.wrap() for a wrapper
cat("Model summary:\n"); summary(greg_model)
```

**Stata template (v14+):**
```stata
* ============================================================
* GREG — Generalised Regression Estimator
* Generated by SAE Syntax Generator on {{DATE}}
* ============================================================

use "{{SURVEY_DATA}}", clear
svyset [pweight = {{WEIGHT_VAR}}]

svy: regress {{TARGET_VAR}} {{AUX_VARS_STATA}}

* Calibrate by area using postestimation margins
margins {{AREA_ID}}
```

---

### 4.03 Fay–Herriot EBLUP (FH)

```
id:              fh-eblup
displayName:     Fay–Herriot EBLUP (Area-Level)
level:           area
inferenceType:   frequentist
targetTypes:     [continuous, proportion, binary]
requiredInputs:
  microdata:           false
  areaAggregates:      true
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       both
rPackage:        sae
rFunction:       eblupFH / mseFH
stataPackage:    fhsae / fayherriot
stataCommand:    fhsae / fayherriot
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  The most widely used area-level SAE method. Combines direct survey estimates with
  a regression on area-level covariates, adding a random area effect to capture
  residual between-area variation. Requires only area-level aggregate data — no microdata
  needed. MSE estimated analytically (Prasad–Rao) or by bootstrap.
whyChooseThis: |
  Choose FH when you have only area-level auxiliary data (e.g. census aggregates) and
  pre-computed direct estimates with their sampling variances. It is the standard starting
  point for area-level SAE and is well validated in the literature.
assumptions:
  - Sampling variances of the direct estimates are known (or reliably estimated).
  - The linking model (regression + random area effect) is correctly specified.
  - Area random effects are normally distributed with constant variance.
  - There are enough areas (m ≥ 20) for reliable variance component estimation.
references:
  - Fay, R.E. & Herriot, R.A. (1979). JASA 74, 269–277.
  - Prasad, N. & Rao, J. (1990). JASA 85, 163–171.
  - Rao & Molina (2015). Small Area Estimation, 2nd ed. Ch. 4.
  - Molina, I. & Marhuenda, Y. (2015). The R Journal 7(1). [sae package]
```

**R template:**
```r
# ============================================================
# Fay–Herriot EBLUP (Area-Level)
# Generated by SAE Syntax Generator on {{DATE}}
# Reference: Fay & Herriot (1979); Rao & Molina (2015) Ch. 4
# R package: sae (Molina & Marhuenda, 2015)
# Area-level data: {{AREA_DATA}}
# ============================================================

if (!requireNamespace("sae", quietly = TRUE)) install.packages("sae")
library(sae)

area_data <- read.csv("{{AREA_DATA}}")
# Required columns: {{DIRECT_EST_VAR}}, {{DIRECT_VAR_VAR}}, {{AUX_VARS_R}}, {{AREA_ID}}

# Fit FH model and obtain EBLUPs (REML estimation by default)
fh_result <- eblupFH(
  formula = {{DIRECT_EST_VAR}} ~ {{AUX_VARS_R}},
  vardir  = area_data${{DIRECT_VAR_VAR}},
  data    = area_data,
  method  = "REML"   # alternatives: "ML", "FH"
)

# MSE estimates (Prasad–Rao analytic)
fh_mse <- mseFH(
  formula = {{DIRECT_EST_VAR}} ~ {{AUX_VARS_R}},
  vardir  = area_data${{DIRECT_VAR_VAR}},
  data    = area_data
)

# Combine results
results <- data.frame(
  area      = area_data${{AREA_ID}},
  direct    = area_data${{DIRECT_EST_VAR}},
  eblup     = fh_result$eblup,
  mse       = fh_mse$mse,
  rmse      = sqrt(fh_mse$mse),
  cv        = sqrt(fh_mse$mse) / fh_result$eblup
)

print(results)
cat("\nModel fit:\n"); print(fh_result$fit$estcoef)
cat("Random effects variance:", fh_result$fit$refvar, "\n")
```

**Stata template (v14+, uses fhsae):**
```stata
* ============================================================
* Fay–Herriot EBLUP (Area-Level)
* Generated by SAE Syntax Generator on {{DATE}}
* Reference: Fay & Herriot (1979)
* Stata package: fhsae (install: net install fhsae from github)
* Area-level data: {{AREA_DATA}}
* ============================================================

* Install fhsae if not available
* net install fhsae, from("https://raw.github.com/jpazvd/fhsae/master/")

use "{{AREA_DATA}}", clear
* Required variables: {{DIRECT_EST_VAR}}, {{DIRECT_VAR_VAR}}, {{AUX_VARS_STATA}}

fhsae {{DIRECT_EST_VAR}} {{AUX_VARS_STATA}}, ///
    vardir({{DIRECT_VAR_VAR}}) ///
    method(reml)

* Results stored in e(): use ereturn list to inspect
ereturn list
```

---

### 4.04 Spatial Fay–Herriot (SFH / SAR-EBLUP)

```
id:              spatial-fh
displayName:     Spatial Fay–Herriot EBLUP (Area-Level, SAR)
level:           area
inferenceType:   frequentist
targetTypes:     [continuous, proportion]
requiredInputs:
  microdata:           false
  areaAggregates:      true
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    true
  coordinates:         false
spatial:         true
robust:          false
mseMethod:       both
rPackage:        sae
rFunction:       eblupSFH / mseSFH
stataPackage:    fhsae
stataCommand:    fhsae with spatialcor option
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  Extends the Fay–Herriot model by allowing area random effects to be spatially correlated
  via a simultaneous autoregressive (SAR) model. Reduces MSE when neighbouring areas share
  characteristics. Requires a spatial contiguity or distance matrix.
whyChooseThis: |
  Choose this over standard FH when your areas are geographically contiguous and you expect
  similar areas to have similar values (e.g. neighbouring districts in a country). The spatial
  model borrows strength across neighbouring areas as well as from auxiliaries.
assumptions:
  - All FH assumptions hold.
  - The SAR spatial structure correctly captures the spatial dependence.
  - The contiguity matrix correctly represents neighbourhood relationships.
references:
  - Pratesi, M. & Salvati, N. (2008). Statistical Methods and Applications 17, 113–141.
  - Singh, B. et al. (2005). Survey Methodology 31(1), 33–40.
  - Rao & Molina (2015). Small Area Estimation, 2nd ed. Ch. 8.
  - FAO (2015). SAE Methods for Agricultural Surveys. Ch. 2.4.3.
caveats:
  - Constructing the contiguity matrix requires GIS boundary files or coordinates.
  - With few areas (m < 15), spatial parameter estimation is unreliable.
```

**R template:**
```r
# ============================================================
# Spatial Fay–Herriot EBLUP (SAR area effects)
# Generated by SAE Syntax Generator on {{DATE}}
# Reference: Pratesi & Salvati (2008)
# R package: sae
# ============================================================

if (!requireNamespace("sae", quietly = TRUE)) install.packages("sae")
if (!requireNamespace("spdep", quietly = TRUE)) install.packages("spdep")
library(sae); library(spdep)

area_data <- read.csv("{{AREA_DATA}}")
# Load contiguity matrix (row-standardised, nb or matrix object)
# Example: W <- nb2mat(poly2nb(your_shapefile), style = "W")
W <- as.matrix(read.csv("{{CONTIG_MATRIX}}", row.names = 1))

sfh_result <- eblupSFH(
  formula = {{DIRECT_EST_VAR}} ~ {{AUX_VARS_R}},
  vardir  = area_data${{DIRECT_VAR_VAR}},
  proxmat = W,
  data    = area_data,
  method  = "REML"
)

sfh_mse <- mseSFH(
  formula = {{DIRECT_EST_VAR}} ~ {{AUX_VARS_R}},
  vardir  = area_data${{DIRECT_VAR_VAR}},
  proxmat = W,
  data    = area_data
)

results <- data.frame(
  area   = area_data${{AREA_ID}},
  eblup  = sfh_result$eblup,
  mse    = sfh_mse$mse,
  cv     = sqrt(sfh_mse$mse) / sfh_result$eblup
)
print(results)
```

---

### 4.05 Robust Fay–Herriot

```
id:              robust-fh
displayName:     Robust Fay–Herriot (Area-Level)
level:           area
inferenceType:   frequentist
targetTypes:     [continuous]
requiredInputs:
  microdata:           false
  areaAggregates:      true
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          true
mseMethod:       bootstrap
rPackage:        saeRobust
rFunction:       rfh
stataPackage:    fhsae
stataCommand:    fhsae with robust option
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  A robustified version of the Fay–Herriot model that downweights outlying areas.
  Useful when a small number of areas have direct estimates that are unusually far from
  the model predictions, which would otherwise distort the variance component estimates.
whyChooseThis: |
  Choose this when you suspect a few areas are atypical or when diagnostic plots for
  the standard FH model show heavy-tailed residuals or influential observations.
assumptions:
  - Same as standard FH, except normality of random effects is relaxed.
  - A small proportion of areas are outliers; the majority follow the FH model.
references:
  - Chambers, R. & Tzavidis, N. (2006). Biometrika 93, 255–268.
  - Sinha, S.K. & Rao, J.N.K. (2009). Canadian Journal of Statistics 37, 381–399.
  - Rao & Molina (2015). Small Area Estimation, 2nd ed. Ch. 7.
```

**R template:**
```r
# ============================================================
# Robust Fay–Herriot
# Generated by SAE Syntax Generator on {{DATE}}
# R package: saeRobust
# ============================================================

if (!requireNamespace("saeRobust", quietly = TRUE)) install.packages("saeRobust")
library(saeRobust)

area_data <- read.csv("{{AREA_DATA}}")

rfh_result <- rfh(
  formula = {{DIRECT_EST_VAR}} ~ {{AUX_VARS_R}},
  vardir  = "{{DIRECT_VAR_VAR}}",
  data    = area_data
)
summary(rfh_result)

# Bootstrap MSE
rfh_mse <- mse(rfh_result, type = "pseudo", B = {{N_SIM}})
print(rfh_mse)
```

---

### 4.06 Hierarchical Bayes Fay–Herriot (HB-FH)

```
id:              hb-fh
displayName:     Hierarchical Bayes Fay–Herriot (Area-Level)
level:           area
inferenceType:   bayesian
targetTypes:     [continuous, binary, proportion, count]
requiredInputs:
  microdata:           false
  areaAggregates:      true
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       posterior
rPackage:        saeHB
rFunction:       hbFH (Normal) / hbFH.Beta / hbFH.Poisson
stataPackage:    base
stataCommand:    (no direct Stata equivalent; use R)
stataMinVersion: 14
stataV14Fallback: |
  * No Stata equivalent for HB-FH. Run the R script for this method.
  * As a Stata-based alternative, use the standard Fay-Herriot model:
  * fhsae {{DIRECT_EST_VAR}} {{AUX_VARS_STATA}}, vardir({{DIRECT_VAR_VAR}}) method(reml)
plainDescription: |
  A fully Bayesian version of the Fay–Herriot model estimated via MCMC. Provides exact
  small-sample inference without relying on asymptotic arguments, naturally quantifies
  all uncertainty including that from hyperparameter estimation, and supports out-of-sample
  areas through the predictive distribution.
whyChooseThis: |
  Choose HB when sample sizes per area are very small (ni < 5), when you need probability
  statements about the estimates (e.g. P(poverty rate > 30%)), or when the target is
  binary or a count and a GLMM area-level model is needed.
assumptions:
  - Prior distributions are correctly specified (check sensitivity).
  - MCMC chains have converged (inspect trace plots and R-hat statistics).
  - Likelihood model (Normal/Beta/Poisson) suits the data.
references:
  - Rao & Molina (2015). Small Area Estimation, 2nd ed. Ch. 10.
  - Datta, G.S. & Ghosh, M. (1991). Annals of Statistics 19, 1748–1770.
  - saeHB package: CRAN, https://cran.r-project.org/package=saeHB
caveats:
  - MCMC can be slow for many areas or complex models.
  - No direct Stata equivalent; R is required.
```

**R template:**
```r
# ============================================================
# Hierarchical Bayes Fay–Herriot
# Generated by SAE Syntax Generator on {{DATE}}
# R package: saeHB
# Reference: Rao & Molina (2015) Ch. 10
# ============================================================

if (!requireNamespace("saeHB", quietly = TRUE)) install.packages("saeHB")
library(saeHB)

area_data <- read.csv("{{AREA_DATA}}")

# Normal HB-FH (use hbFH.Beta for proportions, hbFH.Poisson for counts)
hb_result <- hbFH(
  formula  = {{DIRECT_EST_VAR}} ~ {{AUX_VARS_R}},
  vardir   = area_data${{DIRECT_VAR_VAR}},
  data     = area_data,
  iter.update = 3,
  iter.mcmc   = {{N_SIM}},
  thin        = 3,
  burn.in     = 10000
)

summary(hb_result)
# Posterior mean and SD are the point estimate and uncertainty measure
```

---

### 4.07 Battese–Harter–Fuller EBLUP (BHF)

```
id:              bhf-eblup
displayName:     Battese–Harter–Fuller EBLUP (Unit-Level)
level:           unit
inferenceType:   frequentist
targetTypes:     [continuous]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       both
rPackage:        sae
rFunction:       eblupBHF / pbmseBHF
stataPackage:    base mixed
stataCommand:    mixed
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  The canonical unit-level SAE model. Fits a linear mixed model with area random effects
  to the survey microdata, then uses the estimated model to predict area means for all
  areas (sampled and unsampled), combining individual predictions with the random area effect.
  Requires population means of auxiliary variables for all target areas.
whyChooseThis: |
  Choose BHF when you have household/unit-level survey data and know the population means
  of your auxiliary variables from a census or administrative source. It is the standard
  unit-level method and is well supported in both R and Stata.
assumptions:
  - Linear relationship between target and auxiliary variables at the unit level.
  - Area random effects are normally distributed.
  - Unit-level errors are normally distributed and homoscedastic.
  - Population means of auxiliaries are known without error for all target areas.
  - At least some sampled units in each area (out-of-sample: synthetic predictor only).
references:
  - Battese, G.E., Harter, R.M. & Fuller, W.A. (1988). JASA 83, 28–36.
  - Rao & Molina (2015). Small Area Estimation, 2nd ed. Ch. 7.
  - Molina, I. & Marhuenda, Y. (2015). The R Journal 7(1). [sae package]
```

**R template:**
```r
# ============================================================
# Battese–Harter–Fuller Nested-Error EBLUP (Unit-Level)
# Generated by SAE Syntax Generator on {{DATE}}
# Reference: Battese, Harter & Fuller (1988)
# R package: sae
# Survey data:  {{SURVEY_DATA}}
# Census data:  {{CENSUS_DATA}} (area-level population means of auxiliaries)
# ============================================================

if (!requireNamespace("sae", quietly = TRUE)) install.packages("sae")
library(sae)

survey_data <- read.csv("{{SURVEY_DATA}}")
census_data <- read.csv("{{CENSUS_DATA}}")
# census_data must have: {{AREA_ID}}, population size (Ni), and means of {{AUX_VARS_R}}

# Area population means matrix (columns = auxiliary variable means, rows = areas)
meanxpop <- census_data[, c("{{AREA_ID}}", {{AUX_VARS_R_QUOTED}})]
popnsize  <- data.frame(area = census_data${{AREA_ID}},
                        Ni   = census_data$Ni)

bhf_result <- eblupBHF(
  formula  = {{TARGET_VAR}} ~ {{AUX_VARS_R}},
  dom      = survey_data${{AREA_ID}},
  meanxpop = meanxpop,
  popnsize = popnsize,
  method   = "REML",
  data     = survey_data
)

# Parametric bootstrap MSE
bhf_mse <- pbmseBHF(
  formula  = {{TARGET_VAR}} ~ {{AUX_VARS_R}},
  dom      = survey_data${{AREA_ID}},
  meanxpop = meanxpop,
  popnsize = popnsize,
  B        = {{N_SIM}},
  data     = survey_data
)

results <- data.frame(
  area  = bhf_result$eblup$domain,
  eblup = bhf_result$eblup$eblup,
  mse   = bhf_mse$mse$mse,
  cv    = sqrt(bhf_mse$mse$mse) / bhf_result$eblup$eblup
)
print(results)
```

**Stata template (v14+, base mixed):**
```stata
* ============================================================
* Battese–Harter–Fuller Nested-Error EBLUP (Unit-Level)
* Generated by SAE Syntax Generator on {{DATE}}
* Uses base Stata `mixed` — compatible with Stata 14+
* ============================================================

use "{{SURVEY_DATA}}", clear

* Fit the nested-error linear mixed model
mixed {{TARGET_VAR}} {{AUX_VARS_STATA}} || {{AREA_ID}}:, reml

* Extract random effects (BLUPs) and fixed-effect predictions
predict xb_fixed, xb
predict u_area, reffects

* Predicted small area mean = fixed-effect prediction + BLUP of area effect
gen predicted_mean = xb_fixed + u_area

* NOTE: To get EBLUP for all areas (including unsampled), merge with census
* population means and apply: predicted = beta_hat * x_bar_pop + u_hat (0 for OOS)
```

---

### 4.08 Empirical Best Predictor / CensusEB (Poverty Mapping)

```
id:              ebp-censuseb
displayName:     Empirical Best Predictor / CensusEB (Unit-Level, Poverty Mapping)
level:           unit
inferenceType:   frequentist
targetTypes:     [poverty, continuous]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   unit
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       bootstrap
rPackage:        emdi / povmap / sae
rFunction:       ebp (emdi/povmap) / ebBHF + pbmseebBHF (sae)
stataPackage:    World Bank sae package
stataCommand:    sae model / sae sim
stataMinVersion: 17
stataV14Fallback: |
  * The World Bank sae/povmap package requires Stata 17+.
  * For Stata 14, run the R script instead (emdi/povmap packages).
  * Alternatively, use the base BHF-EBLUP (mixed) as an approximation for means only:
  mixed {{TARGET_VAR}} {{AUX_VARS_STATA}} || {{AREA_ID}}:, reml
plainDescription: |
  The current best-practice method for poverty mapping. Simulates the full welfare
  distribution onto census microdata using a model fitted on the survey, enabling
  estimation of non-linear poverty and inequality indicators (headcount, poverty gap,
  Gini). MSE is estimated by parametric bootstrap. Requires unit-level census auxiliaries.
whyChooseThis: |
  Use this when your target is a poverty rate, a poverty gap, the Gini coefficient,
  or any other non-linear function of a welfare variable. It is the standard method
  recommended by the World Bank and endorsed by Corral et al. (2022).
assumptions:
  - Normality of model residuals (or apply a Box–Cox transformation).
  - The unit-level model fitted on the survey is valid for the census population.
  - Unit-level auxiliary variables in the survey are comparable to those in the census.
  - No informative sampling given the model covariates.
references:
  - Molina, I. & Rao, J.N.K. (2010). Canadian Journal of Statistics 38, 369–385.
  - Corral, P., Molina, I., Cojocaru, A. & Segovia, S. (2022). Guidelines to SAE for
    Poverty Mapping. World Bank. http://hdl.handle.net/10986/37728
  - Kreutzmann, A.-K. et al. (2019). The R Journal 11(1). [emdi package]
  - povmap package: https://cran.r-project.org/package=povmap
caveats:
  - Stata implementation requires v17+; use R (emdi/povmap) for Stata 14 users.
  - Computationally intensive for large census files and many bootstrap replications.
  - If census data are unavailable, the ELL method (id: ell) is an alternative.
```

**R template:**
```r
# ============================================================
# Empirical Best Predictor / CensusEB — Poverty Mapping
# Generated by SAE Syntax Generator on {{DATE}}
# Reference: Molina & Rao (2010); Corral et al. (2022)
# R packages: povmap / emdi
# Survey data: {{SURVEY_DATA}}
# Census data: {{CENSUS_DATA}} (unit-level)
# ============================================================

if (!requireNamespace("povmap", quietly = TRUE)) install.packages("povmap")
library(povmap)

survey_data <- read.csv("{{SURVEY_DATA}}")
census_data <- read.csv("{{CENSUS_DATA}}")

# Fit EBP using povmap (extends emdi with poverty-mapping features)
ebp_result <- ebp(
  fixed       = {{TARGET_VAR}} ~ {{AUX_VARS_R}},
  pop_data    = census_data,
  pop_domains = "{{AREA_ID}}",
  smp_data    = survey_data,
  smp_domains = "{{AREA_ID}}",
  B           = {{N_SIM}},              # bootstrap replications for MSE
  transformation = "log",               # "log", "arcsin", or "no"
  MSE         = TRUE
)

summary(ebp_result)
# Indicators include: Mean, Gini, FGT0 (headcount), FGT1 (gap), FGT2 (severity)
print(estimators(ebp_result, indicator = "FGT0"))  # poverty headcount
```

---

### 4.09 ELL Census Method (World Bank Poverty Mapping)

```
id:              ell
displayName:     ELL Census Method (Elbers–Lanjouw–Lanjouw)
level:           unit
inferenceType:   frequentist
targetTypes:     [poverty, continuous]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   unit
  weights:             true
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       bootstrap
rPackage:        povmap / sae
rFunction:       (see ELL procedure in Corral et al. 2022)
stataPackage:    World Bank sae package
stataCommand:    sae model / sae sim / sae quantiles
stataMinVersion: 17
stataV14Fallback: |
  * The World Bank sae package requires Stata 17+ for the ELL/EB workflow.
  * For Stata 14, use the R script (povmap package) or the older PovMap software
  * from the World Bank (standalone application, no Stata version requirement).
plainDescription: |
  The original World Bank poverty-mapping method. Estimates a welfare model on the survey,
  decomposes residuals into location and household components, then simulates many welfare
  vectors onto the census to produce poverty and inequality measures for each area.
  Superseded by EBP/CensusEB in precision, but still widely used where EBP assumptions
  are harder to meet.
whyChooseThis: |
  Use ELL when the EBP's normality assumption is difficult to satisfy, or when following
  an established institutional protocol. For new analyses, EBP/CensusEB is generally preferred.
assumptions:
  - The two-component residual model (location + household) is correctly specified.
  - Residuals are independently distributed across clusters.
  - Survey and census share comparable variable definitions and measurement periods.
references:
  - Elbers, C., Lanjouw, J. & Lanjouw, P. (2003). Econometrica 71(1), 355–364.
  - Corral, P. et al. (2022). Guidelines to SAE for Poverty Mapping. World Bank.
  - World Bank PovMap software: https://www.worldbank.org/en/data/datatopics/povmap
caveats:
  - EBP is statistically superior for most applications; prefer EBP unless required.
  - Stata requires v17+ via World Bank sae package; use R or PovMap for v14.
```

---

### 4.10 M-Quantile Estimator

```
id:              m-quantile
displayName:     M-Quantile Estimator (Unit-Level, Robust)
level:           unit
inferenceType:   frequentist
targetTypes:     [continuous]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          true
mseMethod:       bootstrap
rPackage:        sae (mq functions) / mquantreg
rFunction:       mq_function (SAMPLE project)
stataPackage:    base
stataCommand:    (no standard package; implement manually or use R)
stataMinVersion: 14
stataV14Fallback: |
  * No standard Stata package for M-quantile SAE.
  * Use the R script. As a Stata fallback, robust regression with rreg provides
  * a related but simplified estimator:
  * rreg {{TARGET_VAR}} {{AUX_VARS_STATA}} i.{{AREA_ID}}
plainDescription: |
  A robust, distribution-free alternative to the EBLUP. Instead of area random effects,
  it uses M-quantile coefficients to characterise between-area differences. Performs well
  when outliers are present or normality is questionable. Does not assume a specific
  parametric distribution for the residuals.
whyChooseThis: |
  Choose M-quantile when you are unsure about the normality of residuals, suspect
  outliers in the survey data, or want a method that does not rely on strong distributional
  assumptions. It is often used as a robustness check alongside EBLUP.
assumptions:
  - A smooth relationship exists between the target and auxiliary variables.
  - The M-quantile coefficients adequately capture between-area variation.
  - Population means of auxiliary variables are known for all target areas.
references:
  - Chambers, R. & Tzavidis, N. (2006). Biometrika 93, 255–268.
  - Marchetti, S., Tzavidis, N. & Pratesi, M. (2012). CSDA 56, 2889–2902.
  - FAO (2015). SAE Methods for Agricultural Surveys. Ch. 2.5.3.
```

---

### 4.11 M-Quantile GWR (MQGWR)

```
id:              mqgwr
displayName:     M-Quantile GWR (Unit-Level, Robust + Spatial)
level:           unit
inferenceType:   frequentist
targetTypes:     [continuous]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         true
spatial:         true
robust:          true
mseMethod:       bootstrap
rPackage:        SAMPLE project functions (mqgwr.sae)
rFunction:       mqgwr.sae
stataPackage:    base
stataCommand:    (no standard Stata package; use R)
stataMinVersion: 14
stataV14Fallback: |
  * No Stata equivalent for MQGWR. Use R. As a spatial approximation in Stata:
  * rreg {{TARGET_VAR}} {{AUX_VARS_STATA}} i.{{AREA_ID}}
plainDescription: |
  Combines M-quantile regression with geographically weighted regression (GWR) to handle
  both outliers and spatial non-stationarity. Each area gets its own locally fitted
  regression, weighted by distance to neighbouring areas. Requires unit coordinates or
  area centroids.
whyChooseThis: |
  Use MQGWR when you have geographic coordinates and suspect that the relationship between
  the target and auxiliary variables varies across space (spatial non-stationarity) in
  addition to possible outliers.
assumptions:
  - M-quantile assumptions hold locally.
  - Spatial relationship between units can be captured by a Euclidean distance kernel.
  - Coordinates (centroids) are available for sampled and non-sampled areas.
references:
  - Salvati, N. et al. (2012). CSDA 56, 2875–2888.
  - FAO (2015). SAE Methods for Agricultural Surveys. Ch. 2.5.4.
```

---

### 4.12 Robust EBLUP (REBLUP, Sinha–Rao)

```
id:              reblup
displayName:     Robust EBLUP — REBLUP (Unit-Level)
level:           unit
inferenceType:   frequentist
targetTypes:     [continuous]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          true
mseMethod:       bootstrap
rPackage:        saeRobust
rFunction:       reblup
stataPackage:    base
stataCommand:    (no standard Stata package; use R)
stataMinVersion: 14
stataV14Fallback: |
  * No standard Stata equivalent for REBLUP. Use the R script.
  * Stata approximation using robust regression:
  * rreg {{TARGET_VAR}} {{AUX_VARS_STATA}} i.{{AREA_ID}}
plainDescription: |
  An outlier-robust version of the nested-error EBLUP. Uses Huber's influence function
  to downweight influential observations when estimating fixed effects and variance
  components, making the estimator robust to departures from normality at the unit level.
whyChooseThis: |
  Choose REBLUP when you want the modelling framework of the BHF model but are concerned
  about outlying units inflating estimates. Performs similarly to M-quantile in most
  scenarios; use REBLUP if you prefer a mixed-model framework.
assumptions:
  - The majority of units follow the nested-error linear model.
  - A small proportion of units are outliers; Huber tuning constant c = 1.345 is appropriate.
references:
  - Sinha, S.K. & Rao, J.N.K. (2009). Canadian Journal of Statistics 37, 381–399.
  - FAO (2015). SAE Methods for Agricultural Surveys. Ch. 5.2.2.
```

---

### 4.13 GLMM-EBP Binary (Logit)

```
id:              glmm-binary
displayName:     GLMM-EBP — Binary / Proportion (Logit Link)
level:           unit
inferenceType:   frequentist
targetTypes:     [binary, proportion]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       bootstrap
rPackage:        lme4 / sae (pbmseebBHF adapted)
rFunction:       glmer (lme4)
stataPackage:    base meglm
stataCommand:    meglm (binomial logit)
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  A generalised linear mixed model with a logit link for binary or proportion outcomes.
  Fits a random-intercept logistic model on the survey microdata. The area means
  (proportions) are predicted as the conditional expectation given the estimated random
  effect and fixed coefficients.
whyChooseThis: |
  Use this when your target variable is binary (yes/no) or a proportion (e.g. rate of
  school attendance, employment rate). It respects the [0,1] range of proportions and
  uses the correct Bernoulli/binomial likelihood.
assumptions:
  - Logistic model is correctly specified.
  - Area random effects are normally distributed on the log-odds scale.
  - Units within each area are conditionally independent given the random effect.
references:
  - Jiang, J. & Lahiri, P. (2001). Ann. Inst. Statistical Mathematics 53, 217–243.
  - Jiang, J. (2003). Journal of Statistical Planning and Inference 111, 117–127.
  - FAO (2015). SAE Methods for Agricultural Surveys. Ch. 2.6.7.
```

**R template:**
```r
# ============================================================
# GLMM-EBP — Binary / Proportion (Logit)
# Generated by SAE Syntax Generator on {{DATE}}
# R package: lme4
# Reference: Jiang & Lahiri (2001)
# ============================================================

if (!requireNamespace("lme4", quietly = TRUE)) install.packages("lme4")
library(lme4)

survey_data <- read.csv("{{SURVEY_DATA}}")

# Fit random-intercept logistic model
glmm_fit <- glmer(
  {{TARGET_VAR}} ~ {{AUX_VARS_R}} + (1 | {{AREA_ID}}),
  data   = survey_data,
  family = binomial(link = "logit")
)
summary(glmm_fit)

# Predicted area proportions
# For sampled areas: conditional on the estimated random effect
# For out-of-sample areas: marginal (random effect = 0)
ranef_vals <- ranef(glmm_fit)${{AREA_ID}}
fixef_vals <- fixef(glmm_fit)

cat("Area-level predicted proportions can be computed using predict(glmm_fit) or\n")
cat("by manually applying the inverse logit to: X_bar_i * beta + u_hat_i\n")
# See Rao & Molina (2015) Ch. 9 for the full EBP derivation for binary models
```

**Stata template (v14+, base meglm):**
```stata
* ============================================================
* GLMM-EBP — Binary / Proportion (Logit)
* Generated by SAE Syntax Generator on {{DATE}}
* Uses base Stata `meglm` — compatible with Stata 14+
* ============================================================

use "{{SURVEY_DATA}}", clear

meglm {{TARGET_VAR}} {{AUX_VARS_STATA}} || {{AREA_ID}}:, family(bernoulli) link(logit)

* Predicted proportions per area
predict p_hat, mu
collapse (mean) p_hat, by({{AREA_ID}})
list
```

---

### 4.14 GLMM-EBP Count (Poisson)

```
id:              glmm-count
displayName:     GLMM-EBP — Count Data (Poisson / Log Link)
level:           unit
inferenceType:   frequentist
targetTypes:     [count]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       bootstrap
rPackage:        lme4
rFunction:       glmer (Poisson)
stataPackage:    base meglm
stataCommand:    meglm (Poisson log)
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  A generalised linear mixed model with a Poisson distribution and log link for count
  outcomes (e.g. number of events per household or area). Includes random area effects
  to capture between-area heterogeneity beyond the Poisson mean.
whyChooseThis: |
  Use this when your target variable is a count (non-negative integer). If the data
  show more zeros than a Poisson model predicts, consider the two-part / zero-inflated
  method instead.
assumptions:
  - Poisson distribution is appropriate (no overdispersion; check with dispersion test).
  - Log-linear model is correctly specified.
  - Area random effects are normally distributed on the log scale.
references:
  - Jiang, J. (2003). Journal of Statistical Planning and Inference 111, 117–127.
  - FAO (2015). SAE Methods for Agricultural Surveys. Ch. 2.6.7.
```

---

### 4.15 Two-Part / Zero-Inflated Model

```
id:              two-part-zinfl
displayName:     Two-Part / Zero-Inflated Model (Unit-Level)
level:           unit
inferenceType:   frequentist
targetTypes:     [count, continuous]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       bootstrap
rPackage:        lme4 (two-model approach)
rFunction:       glmer (binomial) + glmer/lmer (positive part)
stataPackage:    base
stataCommand:    meglm (binomial) + meglm/mixed (positive part)
stataMinVersion: 14
stataV14Fallback: null
plainDescription: |
  Handles data with an excess of zeros by fitting two models: (1) a logistic mixed model
  for the probability of a non-zero outcome, and (2) a linear or count mixed model for
  the magnitude of non-zero outcomes. The area mean is the product of (1) and (2).
whyChooseThis: |
  Use this when your target variable has many zeros — for example, crop yields (many
  farms grow nothing), health expenditures, or agricultural output — and a standard
  Poisson or log-normal model does not fit the data.
assumptions:
  - The zero-generating process is distinct from the positive-value process.
  - Both component models are correctly specified.
  - Area random effects in both parts may be correlated.
references:
  - Pfeffermann, D. et al. (2008). Survey Methodology 34, 105–116.
  - Chandra, H. & Chambers, R. (2014). Computational Statistics 29, 1023–1050.
  - FAO (2015). SAE Methods for Agricultural Surveys. Ch. 8.
```

---

### 4.16 Hierarchical Bayes Unit-Level (HB-Unit)

```
id:              hb-unit
displayName:     Hierarchical Bayes Unit-Level
level:           unit
inferenceType:   bayesian
targetTypes:     [continuous, binary, proportion, count, poverty]
requiredInputs:
  microdata:           true
  areaAggregates:      false
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
spatial:         false
robust:          false
mseMethod:       posterior
rPackage:        saeHB / hbsae / BayesSAE
rFunction:       hbNormal / hbBeta / hbPoisson
stataPackage:    base
stataCommand:    (no direct Stata equivalent; use R)
stataMinVersion: 14
stataV14Fallback: |
  * No Stata equivalent for HB unit-level. Use R (saeHB package).
  * Stata frequentist approximation:
  * mixed {{TARGET_VAR}} {{AUX_VARS_STATA}} || {{AREA_ID}}:, reml
plainDescription: |
  Fully Bayesian unit-level model estimated via MCMC. Handles all outcome types, provides
  exact small-sample posterior distributions, supports out-of-sample areas, and quantifies
  all sources of uncertainty coherently. Particularly suited to sparse data or settings
  where probability statements about estimates are needed.
whyChooseThis: |
  Use HB when: sample sizes per area are very small (ni < 5), you need posterior
  probability statements (e.g. probability poverty rate exceeds a threshold), or the
  target requires a non-Gaussian likelihood that is difficult to handle with REML.
assumptions:
  - Prior distributions are appropriately specified and sensitivity-checked.
  - MCMC chains have converged (check R-hat, effective sample size).
  - The chosen likelihood (Normal/Beta/Poisson) suits the data.
references:
  - Rao & Molina (2015). Small Area Estimation, 2nd ed. Ch. 10–11.
  - Datta, G.S. & Ghosh, M. (1991). Annals of Statistics 19, 1748–1770.
  - saeHB package: https://cran.r-project.org/package=saeHB
caveats:
  - MCMC is computationally intensive for large areas or complex models.
  - No Stata equivalent; R is required for this method.
```

---

## §5 Software and package reference

### R packages (all on CRAN unless noted)

| Package | Version | Key functions | Methods covered |
|---|---|---|---|
| `sae` | ≥ 1.3 | `eblupFH`, `mseFH`, `eblupSFH`, `mseSFH`, `eblupBHF`, `pbmseBHF`, `ebBHF` | FH, Spatial-FH, BHF, EBP |
| `emdi` | ≥ 2.1 | `direct`, `fh`, `ebp` | Direct, FH, EBP with transformation |
| `povmap` | ≥ 1.0 | `ebp` with weights, benchmarking, Stata wrapper | EBP/CensusEB poverty mapping |
| `saeRobust` | ≥ 0.1 | `rfh`, `reblup` | Robust FH, REBLUP |
| `saeHB` | ≥ 1.0 | `hbFH`, `hbNormal`, `hbBeta`, `hbPoisson` | HB area-level and unit-level |
| `lme4` | ≥ 1.1 | `glmer` | GLMM binary/count |
| `JoSAE` | ≥ 0.3 | `eblup.mse.f.wrap` | GREG, EBLUP |
| `survey` | ≥ 4.1 | `svyby`, `svymean`, `svyglm` | Direct, GREG |
| `spdep` | ≥ 1.2 | `nb2mat`, `poly2nb` | Contiguity matrix construction |

### Stata packages

| Package | Install | Methods | Min Stata |
|---|---|---|---|
| `fhsae` | `net install fhsae, from(github)` | FH, Spatial-FH, Robust-FH | 14 |
| `fayherriot` | `ssc install fayherriot` | FH with transformations | 14 |
| `sae` (World Bank) | `ssc install sae` | ELL, EBP/CensusEB | 17* |
| Base `mixed` | built-in | BHF approximation, GLMM-binary | 14 |
| Base `meglm` | built-in | GLMM binary (logit), GLMM count (Poisson) | 14 |

*The World Bank `sae`/`povmap` Stata package has a workaround for Stata < 17: users must run
`lsae_povmap_old.mata` once before using the package. The generated `.do` file must include
this instruction prominently.

---

## §6 Key references

Battese, G.E., Harter, R.M. & Fuller, W.A. (1988). An error-components model for prediction of county crop areas using survey and satellite data. *JASA* 83, 28–36.

Chambers, R. & Tzavidis, N. (2006). M-quantile models for small area estimation. *Biometrika* 93, 255–268.

Corral, P., Molina, I., Cojocaru, A. & Segovia, S. (2022). *Guidelines to Small Area Estimation for Poverty Mapping.* World Bank. http://hdl.handle.net/10986/37728

Elbers, C., Lanjouw, J.O. & Lanjouw, P. (2003). Micro-level estimation of poverty and inequality. *Econometrica* 71(1), 355–364.

FAO (2015). *Spatial Disaggregation and Small-Area Estimation Methods for Agricultural Surveys.* Technical Report GO-07-2015.

Fay, R.E. & Herriot, R.A. (1979). Estimates of income for small places: an application of James–Stein procedures to census data. *JASA* 74, 269–277.

Jiang, J. & Lahiri, P. (2001). Empirical best prediction for small-area inference with binary data. *Ann. Inst. Statistical Mathematics* 53, 217–243.

Kreutzmann, A.-K. et al. (2019). The R package emdi for estimating and mapping regionally disaggregated indicators. *The R Journal* 11(1). https://doi.org/10.18637/jss.v091.i07

Molina, I. & Marhuenda, Y. (2015). sae: An R package for small area estimation. *The R Journal* 7(1), 81–98.

Molina, I. & Rao, J.N.K. (2010). Small area estimation of poverty indicators. *Canadian Journal of Statistics* 38, 369–385.

Pfeffermann, D. (2013). New important developments in small area estimation. *Statistical Science* 28(1), 40–68.

Prasad, N. & Rao, J.N.K. (1990). The estimation of mean squared error of small-area estimators. *JASA* 85, 163–171.

Rao, J.N.K. & Molina, I. (2015). *Small Area Estimation*, 2nd ed. Wiley.

Sinha, S.K. & Rao, J.N.K. (2009). Robust small area estimation. *Canadian Journal of Statistics* 37, 381–399.

Asian Development Bank (2020). *Introduction to Small Area Estimation Techniques: A Practical Guide for National Statistical Offices.* https://www.adb.org/publications/introduction-small-area-estimation-techniques

---

## §7 Survey-based auxiliary variables (added v1.1.0)

Some users have auxiliary variables that come from a large *sample* (such as an agricultural
census run as a sample) rather than a full census or register. Those auxiliaries carry sampling
error. The standard Fay–Herriot model assumes auxiliaries are known exactly; using it here biases
the model, understates uncertainty, and can perform worse than the direct estimate. This section
adds the measurement-error Fay–Herriot model (Ybarra & Lohr, 2008).

When the user declares sample-based auxiliaries, the recommender ranks `fh-me` first for
area-level continuous or proportion targets and attaches a prominent caveat to every standard
known-covariate area-level method (`fh-eblup`, `spatial-fh`, `robust-fh`). If the sampling
variances of the auxiliary estimates are not available, `fh-me` carries a blocking caveat because
the correction cannot be applied without them.

### 7.01 Fay–Herriot with Measurement Error (Ybarra–Lohr)

```
id:              fh-me
displayName:     Fay–Herriot with Measurement Error (Area-Level, Sample-Based Auxiliaries)
level:           area
inferenceType:   frequentist
targetTypes:     [continuous, proportion]
requiredInputs:
  microdata:           false
  areaAggregates:      true
  censusAuxiliaries:   area
  weights:             false
  contiguityMatrix:    false
  coordinates:         false
requiresAuxiliaryVariances: true
spatial:         false
robust:          false
mseMethod:       jackknife
rPackage:        emdi (or saeME)
rFunction:       fh(method = "me") / saeME::eblupME
stataPackage:    base
stataCommand:    (no standard Stata command; use R)
stataMinVersion: 14
stataV14Fallback: |
  * There is no standard Stata command for the measurement-error Fay-Herriot model.
  * Run the R script for this method (emdi or saeME package).
  * If you must stay in Stata, the standard fhsae command ignores auxiliary
  * sampling error and may bias the estimates — interpret with caution:
  * fhsae {{DIRECT_EST_VAR}} {{AUX_VARS_STATA}}, vardir({{DIRECT_VAR_VAR}}) method(reml)
plainDescription: |
  An extension of the Fay–Herriot model for when your auxiliary variables come from a
  sample (for example, an agricultural census run as a large sample) rather than a full
  census, so the auxiliaries carry their own sampling error. The model adjusts for that
  error, leaning more on the direct survey estimate in areas where the auxiliaries are
  noisier. It needs the sampling variance of each auxiliary estimate for each area.
whyChooseThis: |
  Choose this when your area-level auxiliary totals or means are themselves survey
  estimates rather than known population values. Using a standard Fay–Herriot model in
  that situation can bias the results and overstate their precision, and can even do worse
  than the direct estimate. This method is designed to avoid that.
assumptions:
  - Sampling variances of the auxiliary estimates are available for each area.
  - The auxiliary measurement error is of the classical type (observed = true + noise).
  - All other Fay–Herriot assumptions hold (known direct-estimate variances; correct
    linking model; enough areas for variance estimation).
references:
  - Ybarra, L.M.R. & Lohr, S.L. (2008). Biometrika 95(4), 919–931.
    https://doi.org/10.1093/biomet/asn048
  - Harmening, S. et al. (2023). The R Journal 15(1), RJ-2023-039.
    https://journal.r-project.org/articles/RJ-2023-039/
  - saeME package: https://cran.r-project.org/package=saeME
caveats:
  - Requires the sampling variances of the auxiliary estimates; without them the
    correction cannot be applied.
  - MSE is estimated by jackknife only.
  - No Stata equivalent; R is required.
```

**R template:**
```r
# ============================================================
# Fay–Herriot with Measurement Error (Ybarra–Lohr)
# For auxiliary variables that come from a sample (e.g. an agricultural
# census run as a large sample), and therefore carry sampling error.
# Generated by SAE Syntax Generator on {{DATE}}
# Reference: Ybarra & Lohr (2008); Harmening et al. (2023)
# R package: emdi
# Area-level data: {{AREA_DATA}}
# ============================================================

if (!requireNamespace("emdi", quietly = TRUE)) install.packages("emdi")
library(emdi)

area_data <- read.csv("{{AREA_DATA}}")
# Required columns:
#   {{DIRECT_EST_VAR}}      direct estimate of the target, per area
#   {{DIRECT_VAR_VAR}}      sampling variance of the direct estimate, per area
#   {{AUX_VARS_R}}          auxiliary estimates (from the large-sample census)
#   {{AUX_VAR_VARIANCES_R}} sampling variance of each auxiliary estimate, per area
#   {{AREA_ID}}             area identifier

# Build the per-domain measurement-error variance–covariance array Ci.
# emdi expects an array of (p+1) x (p+1) x m, where p = number of auxiliaries,
# the leading row/column is the intercept (zero variance), and off-diagonal
# covariances between auxiliaries are assumed zero unless supplied.
{{CI_ARRAY_BUILDER_R}}

# Fit the measurement-error Fay–Herriot model
fh_me <- fh(
  fixed         = {{DIRECT_EST_VAR}} ~ {{AUX_VARS_R}},
  vardir        = "{{DIRECT_VAR_VAR}}",
  combined_data = area_data,
  domains       = "{{AREA_ID}}",
  method        = "me",
  Ci            = Ci,
  MSE           = TRUE,
  mse_type      = "jackknife"
)

summary(fh_me)
estimators(fh_me, MSE = TRUE, CV = TRUE)

# NOTE: the modified shrinkage factor leans more on the direct estimate in
# areas where the auxiliary variances are large. Compare against the direct
# estimate (the benchmark) to confirm the model is helping rather than harming.
```

**Stata template:** use the `stataV14Fallback` note above (R-only method).
