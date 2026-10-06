# Model Routing & Campaign Packages

## Product contract

Users never select or see underlying provider/model names. The product exposes stable codenames:

- **Swift** — fast & economical
- **Balance** — balanced speed/quality/cost
- **Pro** — high quality
- **Studio** — creative/premium
- **Cinematic** — premium visual storytelling

The underlying model is an implementation detail owned by the Model Registry.

## Routing modes

### Manual
The user selects a codename per capability or campaign.

### Automatic
The Campaign Agent selects the best available profile using campaign importance, quality target, speed, and budget constraints.

## Campaign packages

The planning experience offers multiple package options:

- **Starter** — efficient coverage for testing and always-on content.
- **Growth** — balanced mix for consistent multi-platform campaigns.
- **Signature** — premium creative treatment for important launches.

Each package contains platforms, content types, asset counts, model policy, estimated credits, and estimated generation time.

## Cost model

Every generation-capable model profile has a product-facing credits rate. Campaign estimates use asset count × selected profile credits.

The UI should show estimated credits, assumptions, uncertainty, and which assets drive most of the cost. Actual provider costs and model names remain behind the Model Registry.