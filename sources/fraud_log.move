module aptash::FraudLog {
    use std::signer;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::timestamp;


    struct FraudEvent has copy, drop, store {
        sender: address,
        amount: u64,
        timestamp: u64,
    }

    struct FraudLog has key {
        events: vector<FraudEvent>,
        fraud_event_handle: event::EventHandle<FraudEvent>,
    }

   public entry fun initialize(account: &signer) {
    let event_handle = event::new_event_handle<FraudEvent>(account);
    move_to(account, FraudLog {
        events: vector::empty<FraudEvent>(),
        fraud_event_handle: event_handle,
    });
}


    public entry fun log_fraud(account: &signer, sender: address, amount: u64) acquires FraudLog {
        let log = borrow_global_mut<FraudLog>(signer::address_of(account));
        let ev = FraudEvent {
            sender,
            amount,
            timestamp: timestamp::now_seconds(),
        };
        vector::push_back(&mut log.events, ev);
        event::emit_event(&mut log.fraud_event_handle, ev);
    }
}