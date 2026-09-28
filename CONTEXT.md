# Snail-race betting app

A web app where a User follows a simulated day of snail races, sees how their simulated bets went, and adds funds to their balance through SnailPay, a mock payment gateway.

## People

**User**:
A person registered in the app with a full name, an email and a password. Several Users can be registered in the same browser, and each one has their own Balance and history.
_Avoid_: Account, Player, Bettor, Customer

**Session**:
The period during which a User is signed in on a browser.
_Avoid_: Login (as a noun)

**Payer**:
A User as seen by SnailPay: the person on whose behalf a Charge is made.
_Avoid_: Customer, Client

## Money

**Balance**:
The funds a User has available, in Mexican pesos (MXN) to the cent. It starts at zero, never goes negative, and increases only when a Top-up is credited. It always equals the sum of the User's credited Top-ups.
_Avoid_: Wallet, Credit, Funds

**Top-up**:
A User's attempt to add funds to their Balance through SnailPay. Each Top-up corresponds to exactly one Charge, and it ends with one Top-up outcome.
_Avoid_: Recharge, Deposit, Payment, Transaction

**Top-up outcome**:
How a Top-up ended. **Credited**: its Charge was approved and the amount was added to the Balance exactly once. **Declined**: its Charge was rejected. **Failed**: SnailPay could not process it. **Unknown**: no answer arrived from SnailPay. Unknown is provisional: the Balance stays unchanged until Reconciliation settles the Top-up as Credited, Declined or Failed.
_Avoid_: Top-up status (status belongs to a Charge)

**Pending**:
A Top-up that has started but has no Top-up outcome yet, because its Charge has not been answered. A Pending Top-up that the app loses track of, for example because the page was reloaded, is treated as Unknown.
_Avoid_: Processing, In progress

**Reconciliation**:
Confirming with SnailPay what happened to a Top-up whose outcome is Unknown, and settling it.
_Avoid_: Sync, Recovery

**Charge**:
SnailPay's record of one attempt to collect an amount from a Card on behalf of a Payer. Its status says whether it was approved, and its status detail explains why.
_Avoid_: Payment, Transaction, Operation

**Card**:
The fictitious card data submitted with a Charge: number, expiry date, CVV and cardholder name.
_Avoid_: Payment method

**Scenario**:
A documented set of inputs that makes SnailPay produce one specific result, such as an approval, a particular rejection, a system error or a timeout.
_Avoid_: Test card, Magic value, Mock case

## Racing

**Snail**:
One of the six named snails. All six run in every Race.
_Avoid_: Runner, Competitor

**Race Day**:
A day on which exactly six Races take place.
_Avoid_: Session, Round

**Race**:
A single contest within a Race Day that has exactly one winning Snail.
_Avoid_: Heat, Match

**Win**:
A Race's result credited to the Snail that finished first. A Race Day has exactly as many Wins as Races.
_Avoid_: Victory, Point

**Bet**:
A User's simulated wager on one Snail in one Race. It is **won** if that Snail won the Race and **lost** otherwise. A User can have several Bets in the same Race. A Bet carries no amount and never affects the Balance.
_Avoid_: Wager, Ticket, Pick
