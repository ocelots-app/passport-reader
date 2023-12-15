use ark_circom::{CircomBuilder, CircomConfig};
use ark_std::rand::thread_rng;
use color_eyre::Result;
use std::os::raw::c_int;

use ark_bn254::Bn254;
use ark_crypto_primitives::snark::SNARK;
use ark_groth16::{Groth16, Proof};
// use ark_ff::QuadExtField;
use ark_ec::AffineRepr;

use std::time::Instant;
use std::convert::TryInto;

type GrothBn = Groth16<Bn254>;

extern crate jni;
use jni::objects::{JClass, JObject, JValue, JString};
use jni::JNIEnv;
use jni::sys::jobject;
use jni::sys::jstring;

use log::Level;
use android_logger::Config;

extern crate serde;
extern crate serde_json;
use serde_json::json;
#[macro_use]
extern crate serde_derive;


#[no_mangle]
pub extern "C" fn Java_io_tradle_nfc_RNPassportReaderModule_callRustCode(
    env: JNIEnv,
    _: JClass,
) -> jstring {
    android_logger::init_once(Config::default().with_min_level(Level::Trace));
    log::warn!("log before imports");

    let my_int: c_int = -1;
    let my_str: String = "no_proof".to_string();
    
    let combined = json!({
        "my_int": my_int,
        "my_str": my_str
    });
    
    let combined_str = combined.to_string();
    let output = env.new_string(combined_str).expect("Couldn't create java string!");

    output.into_inner()
}

#[no_mangle]
pub extern "C" fn Java_io_tradle_nfc_RNPassportReaderModule_proveRSAInRust(
    _: JNIEnv,
    _: JClass,
) -> c_int {
    fn run() -> Result<u128, Box<dyn std::error::Error>> {
        println!("log before imports");
        Ok(10)
    }
    match run() {
        Ok(elapsed_millis) => elapsed_millis as i32, // Assuming the elapsed time will fit in an i32
        Err(_) => -1, // return -1 or some other error code when there's an error
    }
}




#[no_mangle]
pub extern "C" fn Java_io_tradle_nfc_RNPassportReaderModule_provePassport(
    env: JNIEnv,
    _: JClass,
    mrz: JObject,
    data_hashes: JObject,
    e_content_bytes: JObject,
    signature: JObject,
    pubkey: JObject,
    tbs_certificate: JObject,
    csca_pubkey: JObject,
    dsc_signature: JObject,
) -> jstring {
    
    log::warn!("formatting inputsaaaa...");
    fn run_proof(
        mrz: JObject,
        data_hashes: JObject,
        e_content_bytes: JObject,
        signature: JObject,
        pubkey: JObject,
        tbs_certificate: JObject,
        csca_pubkey: JObject,
        dsc_signature: JObject,
        env: JNIEnv
    ) -> Result<jstring, Box<dyn std::error::Error>> {
        android_logger::init_once(Config::default().with_min_level(Level::Trace));

        // Passport circom circuit
        log::warn!("formatting inputs...");
        log::warn!("mrz_veccccccc");
        
        let mrz_vec: Vec<String> = java_arraylist_to_rust_vec(&env, mrz)?;
        let data_hashes_vec: Vec<String> = java_arraylist_to_rust_vec(&env, data_hashes)?;
        let e_content_bytes_vec: Vec<String> = java_arraylist_to_rust_vec(&env, e_content_bytes)?;
        let signature_vec: Vec<String> = java_arraylist_to_rust_vec(&env, signature)?;
        let pubkey_vec: Vec<String> = java_arraylist_to_rust_vec(&env, pubkey)?;

        log::warn!("mrz_vec {:?}", mrz_vec);
        log::warn!("data_hashes_vec {:?}", data_hashes_vec);
        log::warn!("e_content_bytes_vec {:?}", e_content_bytes_vec);
        log::warn!("signature_vec {:?}", signature_vec);
        log::warn!("pubkey_vec {:?}", pubkey_vec);
        
        log::warn!("loading passport circuit...");
        const PASSPORT_WASM: &'static [u8] = include_bytes!("../passport/passport.wasm");
        const PASSPORT_R1CS: &'static [u8] = include_bytes!("../passport/passport.r1cs");
        
        /*let cfg = CircomConfig::<Bn254>::new(
            "../passport/passport.wasm",
            "../passport/passport.r1cs",
        )?;*/
        let passport_cfg = CircomConfig::<Bn254>::from_bytes(PASSPORT_WASM, PASSPORT_R1CS)?;
        log::warn!("circuit loaded");

        let mut passport_builder = CircomBuilder::new(passport_cfg);

        mrz_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| passport_builder.push_input("mrz", n));
        data_hashes_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| passport_builder.push_input("dataHashes", n));
        e_content_bytes_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| passport_builder.push_input("eContentBytes", n));
        signature_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| passport_builder.push_input("signature", n));
        pubkey_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| passport_builder.push_input("pubkey", n));

        // create an empty instance for setting it up
        let circom_passport = passport_builder.setup();
        
        let mut rng = thread_rng();
        let params_passport = GrothBn::generate_random_parameters_with_reduction(circom_passport, &mut rng)?;
        
        let circom_passport = passport_builder.build()?;
        println!("circuit built");
        
        let inputs_passport = circom_passport.get_public_inputs().unwrap();
        
        let start1 = Instant::now();
        
        let proof_passport = GrothBn::prove(&params_passport, circom_passport, &mut rng)?;
        
        let proof_passport_str = proof_to_proof_str(&proof_passport);

        let passport_serialized_proof = serde_json::to_string(&proof_passport_str).unwrap();

        let duration1 = start1.elapsed();
        println!("proof generated. Took: {:?}", duration1);
        
        let start2 = Instant::now();

        let pvk = GrothBn::process_vk(&params_passport.vk).unwrap();
        
        let verified = GrothBn::verify_with_processed_vk(&pvk, &inputs_passport, &proof_passport)?;
        let duration2 = start2.elapsed();
        println!("proof verified. Took: {:?}", duration2);

        assert!(verified);

        // DSC verifier circuit

       /* let tbs_certificate_vec: Vec<String> = java_arraylist_to_rust_vec(&env, tbs_certificate)?;
        let csca_pubkey_vec: Vec<String> = java_arraylist_to_rust_vec(&env, csca_pubkey)?;
        let dsc_signature_vec: Vec<String> = java_arraylist_to_rust_vec(&env, dsc_signature)?;

        log::warn!("tbs_certificate {:?}", tbs_certificate_vec);
        log::warn!("csca_pubkey {:?}", csca_pubkey_vec);
        log::warn!("dsc_signature {:?}", dsc_signature_vec);

        log::warn!("loading dsc verifier circuit...");
        const DSC_VERIFIER_WASM: &'static [u8] = include_bytes!("../passport/dscVerifier.wasm");
        const DSC_VERIFIER_R1CS: &'static [u8] = include_bytes!("../passport/dscVerifier.r1cs");

        let dsc_verifier_cfg = CircomConfig::<Bn254>::from_bytes(DSC_VERIFIER_WASM, DSC_VERIFIER_R1CS)?;
        log::warn!("circuit loaded");

        let mut dsc_verifier_builder = CircomBuilder::new(dsc_verifier_cfg);

        tbs_certificate_vec.iter()
        .filter_map(|s| s.parse::<u128>().ok())
        .for_each(|n| dsc_verifier_builder.push_input("tbsCertificate", n));
        csca_pubkey_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| dsc_verifier_builder.push_input("pubkey", n));
        dsc_signature_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| dsc_verifier_builder.push_input("signature", n));

        // create an empty instance for setting it up
        let circom_dsc_verifier = dsc_verifier_builder.setup();

        let mut rng = thread_rng();
        let params_dsc_verifier = GrothBn::generate_random_parameters_with_reduction(circom_dsc_verifier, &mut rng)?;
        
        let circom_dsc_verifier = dsc_verifier_builder.build()?;
        println!("circuit built");
        
        let inputs_dsc_verifier = circom_dsc_verifier.get_public_inputs().unwrap();
        
        let start1 = Instant::now();
        
        let proof_dsc_verifier = GrothBn::prove(&params_dsc_verifier, circom_dsc_verifier, &mut rng)?;
        
        let proof_dsc_verifier_str = proof_to_proof_str(&proof_dsc_verifier);

        let dsc_verifier_serialized_proof = serde_json::to_string(&proof_dsc_verifier_str).unwrap();

        let duration1_dsc_verifier = start1.elapsed();
        println!("proof generated. Took: {:?}", duration1_dsc_verifier);
        
        let start2 = Instant::now();

        let pvk = GrothBn::process_vk(&params_dsc_verifier.vk).unwrap();
        
        let verified = GrothBn::verify_with_processed_vk(&pvk, &inputs_dsc_verifier, &proof_dsc_verifier)?;
        let duration2_dsc_verifier: std::time::Duration = start2.elapsed();
        println!("proof verified. Took: {:?}", duration2_dsc_verifier);

        assert!(verified);*/

        // Format response

        let combined = json!({
            "passport_duration": duration1.as_millis(),
            "passport_serialized_proof": passport_serialized_proof,
            //"dsc_verifier_duration": duration1_dsc_verifier.as_millis(),
            //"dsc_verifier_serialized_proof": dsc_verifier_serialized_proof,
        });
        
        let combined_str = combined.to_string();
        let output = env.new_string(combined_str).expect("Couldn't create java string!");
    
        Ok(output.into_inner())
    }

    match run_proof(
        mrz,
        data_hashes,
        e_content_bytes,
        signature,
        pubkey,
        tbs_certificate,
        csca_pubkey,
        dsc_signature,
        env
    ) {
        Ok(output) => output,
        Err(_) => env.new_string("error").expect("Couldn't create java string!").into_inner(),
    }
}

fn java_arraylist_to_rust_vec(env: &JNIEnv, java_list: JObject) -> Result<Vec<String>, jni::errors::Error> {
    let size = env.call_method(java_list, "size", "()I", &[])?.i()? as i32;
    let mut vec = Vec::with_capacity(size.try_into().unwrap());

    for i in 0..size {
        let java_string = env.call_method(java_list, "get", "(I)Ljava/lang/Object;", &[JValue::from(i)])?.l()?;
        let rust_string: String = env.get_string(java_string.into())?.into();
        vec.push(rust_string);
    }

    Ok(vec)
}

// -message:"BpfCoordinator"  -message:"MATCH" -message:"maximum"  -message:"exception" level:WARN

#[derive(Debug)]
#[derive(Serialize)]
struct ProofStr {
    a: (String, String),
    b: ((String, String), (String, String)), // Represent each QuadExtField by two BaseFields
    c: (String, String),
}

fn proof_to_proof_str(proof: &Proof<Bn254>) -> ProofStr {
    let a_xy = proof.a.xy().unwrap();
    let b_xy = proof.b.xy().unwrap();
    let c_xy = proof.c.xy().unwrap();

    let b_c0_c0 = b_xy.0.c0.to_string();
    let b_c0_c1 = b_xy.0.c1.to_string();
    let b_c1_c0 = b_xy.1.c0.to_string();
    let b_c1_c1 = b_xy.1.c1.to_string();

    ProofStr {
        a: (a_xy.0.to_string(), a_xy.1.to_string()),
        b: ((b_c0_c0, b_c0_c1), (b_c1_c0, b_c1_c1)),
        c: (c_xy.0.to_string(), c_xy.1.to_string()),
    }
}
