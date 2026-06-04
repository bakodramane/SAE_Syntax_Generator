# Stata v14 Compatibility Notes

This document lists all 16 SAE methods in the catalogue, their Stata version requirements,
and what the generated script will do when you select Stata 14.

---

## Quick reference

| Method | Stata 14 status | Command / package |
|--------|----------------|-------------------|
| Direct Estimator | ✅ Full support | `svy: mean` (base Stata) |
| GREG | ✅ Full support | `svy: regress` (base Stata) |
| BHF EBLUP (unit-level) | ✅ Full support | `mixed` (base Stata) |
| GLMM-EBP Binary | ✅ Full support | `meglm` (base Stata) |
| GLMM-EBP Count | ✅ Full support | `meglm` (base Stata) |
| Two-Part / Zero-Inflated | ✅ Full support | `meglm` (base Stata) |
| Fay–Herriot EBLUP | ✅ With user package | `fhsae` or `fayherriot` |
| Spatial Fay–Herriot | ✅ With user package | `fhsae` (spatialcor option) |
| Robust Fay–Herriot | ✅ With user package | `fhsae` (robust option) |
| EBP / CensusEB | ⚠️ Fallback to `mixed` | Requires v17 for full World Bank sae package |
| ELL Census Method | ⚠️ Fallback to `mixed` | Requires v17 for full World Bank sae package |
| Hierarchical Bayes FH | ❌ R only | No Stata equivalent |
| Hierarchical Bayes Unit-Level | ❌ R only | No Stata equivalent |
| M-Quantile | ❌ R only | No standard Stata package |
| M-Quantile GWR | ❌ R only | No standard Stata package |
| REBLUP (Robust Unit-Level) | ❌ R only | No standard Stata package |

---

## Fully supported on Stata 14 (base commands)

These methods use commands that have been part of Stata since version 12 or earlier.
No additional installation is required.

### Direct Estimator
- **Command:** `svy: mean` / `svy: proportion` / `svy: total`
- Uses the built-in survey prefix. Set your survey design with `svyset` first.
- **Note:** Direct estimation works well only when area sample sizes are large (n ≥ 25 per
  area). It serves as a benchmark, not a replacement for model-based SAE.

### GREG — Generalised Regression Estimator
- **Command:** `svy: regress`
- Calibration weights are computed post-estimation. The generated script shows how to
  combine domain means to obtain GREG estimates.

### BHF EBLUP (Battese–Harter–Fuller, Unit-Level)
- **Command:** `mixed`
- The `mixed` command (introduced in Stata 13) fits the nested-error regression model.
  EBLUPs are recovered from the fitted random effects. The generated script extracts
  small area predictions from `_b[...]` and `predict, reffects`.

### GLMM-EBP Binary / Proportion
- **Command:** `meglm ... , family(binomial) link(logit)`
- `meglm` is available from Stata 14. The empirical best predictor is approximated from
  the fitted model's random effects.

### GLMM-EBP Count Data
- **Command:** `meglm ... , family(poisson) link(log)`
- Same as above with the Poisson link.

### Two-Part / Zero-Inflated Model
- **Command:** `meglm` (binomial part) + `mixed` or `meglm` (positive part)
- Both parts use base Stata 14 commands. The script runs two models and combines their
  predictions.

---

## Supported with user-written packages (Stata 14)

These methods require a user-written package to be installed. The generated script includes
the installation command.

### Fay–Herriot EBLUP (Area-Level)
- **Package:** `fhsae` (Mehmetoglu & Jakobsen) or `fayherriot` (World Bank variant)
- **Install:** `net install fhsae, from("https://raw.github.com/jpazvd/fhsae/master/")`
- Fits the FH model with REML, ML, or FH estimators. Prasad–Rao analytic MSE and
  parametric bootstrap MSE are both available.
- Works on Stata 14 without restrictions.

### Spatial Fay–Herriot EBLUP
- **Package:** `fhsae` (with the `spatialcor` option)
- **Install:** same as above
- Requires a spatial weight matrix stored as a Stata matrix or external file.
- Works on Stata 14 without restrictions.

### Robust Fay–Herriot
- **Package:** `fhsae` (with the `robust` option)
- **Install:** same as above
- Uses M-estimation to down-weight influential area-level observations.
- Works on Stata 14 without restrictions.

---

## Require Stata 17+ — fallback provided

These methods rely on the World Bank `sae` Stata package, which requires Stata 17 or later.
When you select Stata 14 in the wizard, the generated `.do` file automatically uses the
`mixed` command as a simpler unit-level alternative.

### EBP / CensusEB (Poverty Mapping)
- **Requires:** Stata 17 + World Bank `sae` package
- **Package:** `ssc install sae` (Stata 17+)
- **World Bank notes:** https://github.com/pcorralrodas/SAE-Stata-Package
- **Stata 14 fallback:** The generated script uses `mixed` to fit the nested-error
  regression model and computes area predictions from random effects. This approximation
  does not perform the full Monte Carlo simulation used by the EBP; mean squared errors
  are therefore only approximate. Use R with the `povmap` package for a complete
  implementation on Stata 14 machines.
- **R alternative:** `povmap` (https://cran.r-project.org/package=povmap) or `emdi`.

### ELL Census Method
- **Requires:** Stata 17 + World Bank `sae` package
- **Stata 14 fallback:** Same `mixed`-based approach as EBP above. Produces area-level
  predictions but not the full household-level simulation.
- **R alternative:** `povmap` supports both EBP and ELL; use the R script generated
  alongside the fallback `.do` file.

---

## R only — no Stata implementation

These methods have no standard Stata implementation. The generated `.do` file explains this
and directs you to the R script instead.

### Hierarchical Bayes Fay–Herriot
- **Why R only:** MCMC-based inference requires specialised software. The `saeHB` R package
  provides full posterior inference; there is no equivalent in Stata.
- **R package:** `saeHB` (https://cran.r-project.org/package=saeHB)

### Hierarchical Bayes Unit-Level
- **Why R only:** Same as above. Full Bayesian unit-level models are not available in Stata.
- **R package:** `saeHB`

### M-Quantile Estimator
- **Why R only:** M-quantile regression for SAE requires iteratively reweighted estimation
  that is not available as a standard Stata command.
- **R package:** `mquantreg` (https://cran.r-project.org/package=mquantreg)

### M-Quantile GWR (Geographically Weighted)
- **Why R only:** Combines geographically weighted regression with M-quantile estimation.
  No Stata package exists.
- **R package:** Custom implementation; see Salvati et al. (2012).

### REBLUP (Robust Unit-Level EBLUP)
- **Why R only:** Sinha–Rao M-estimation for unit-level SAE is not available in any
  released Stata package.
- **R package:** `saeRobust` (https://cran.r-project.org/package=saeRobust)

---

## General advice for Stata 14 users

1. **Try R for complex methods.** If your target method is R-only, the generator produces a
   complete R script that you can run in RStudio. R is free and available at
   https://www.r-project.org/.

2. **Bootstrap MSE in Stata.** Stata's `bootstrap` prefix can approximate MSE for any
   model, including the `mixed`-based fallbacks. The generated scripts include a commented
   bootstrap block.

3. **Upgrading Stata.** If your institution can upgrade to Stata 17+, the full World Bank
   `sae` package becomes available for EBP and ELL, providing the official Monte Carlo
   simulation and household-level poverty mapping.

4. **World Bank resources.** The World Bank's SAE team maintains the `sae` Stata package
   and detailed training materials:
   https://github.com/pcorralrodas/SAE-Stata-Package

5. **FAO reference.** The FAO guide covers Stata implementations for many methods in this
   catalogue: https://www.fao.org/3/i4818e/i4818e.pdf
