module aptash::P2PLending {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use std::string::{Self, String};

    struct Loan has store, drop, copy {
        loan_id: String,
        lender: address,
        borrower: address,
        amount: u64,
        interest_rate: u64, // Percentage * 100 (e.g., 5% = 500)
        token: String,
        status: String, // "Open", "Accepted", "Repaid"
        created_at: u64,
    }

    struct LoanStore has key {
        loans: vector<Loan>,
        loan_counter: u64,
    }

    public entry fun init(account: &signer) {
        move_to(account, LoanStore { 
            loans: vector::empty<Loan>(),
            loan_counter: 0,
        });
    }

    public entry fun offer_loan(
        account: &signer,
        amount: u64,
        interest_rate: u64,
        token: String
    ) acquires LoanStore {
        let lender = signer::address_of(account);
        
        // Create a simple loan ID using counter and timestamp
        let loan_store = borrow_global_mut<LoanStore>(lender);
        loan_store.loan_counter = loan_store.loan_counter + 1;
        let timestamp_str = string::utf8(b"loan_");
        string::append(&mut timestamp_str, string::utf8(b"123")); // Simple ID for now
        
        let loan = Loan {
            loan_id: timestamp_str,
            lender,
            borrower: @0x0,
            amount,
            interest_rate,
            token,
            status: string::utf8(b"Open"),
            created_at: timestamp::now_seconds(),
        };
        vector::push_back(&mut loan_store.loans, loan);
    }

    public entry fun accept_loan(
        account: &signer,
        lender: address,
        loan_id: String
    ) acquires LoanStore {
        let borrower = signer::address_of(account);
        let loan_store = borrow_global_mut<LoanStore>(lender);
        let i = 0;
        let len = vector::length(&loan_store.loans);
        while (i < len) {
            let loan = vector::borrow_mut(&mut loan_store.loans, i);
            if (loan.loan_id == loan_id && loan.status == string::utf8(b"Open")) {
                loan.borrower = borrower;
                loan.status = string::utf8(b"Accepted");
                // Transfer amount from lender to borrower (requires coin module)
                // 0x1::coin::transfer<0x1::usdc::USDC>(lender, borrower, loan.amount);
                break
            };
            i = i + 1;
        };
    }

    #[view]
    public fun get_loans(lender: address): vector<Loan> acquires LoanStore {
        let loan_store = borrow_global<LoanStore>(lender);
        loan_store.loans
    }
}