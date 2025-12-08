import { Company } from '../types';

export const DEFAULT_ALLOWED_DOMAIN = 'empresa.com';

export const normalizeDomainCandidate = (domain?: string | null): string | null => {
  if (!domain) return null;
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed) return null;
  const sanitized = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return sanitized || null;
};

export const extractDomainFromEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return null;
  return normalized.slice(atIndex + 1);
};

export const deriveAllowedDomains = (
  company: Company | null,
  provided?: string[]
): string[] => {
  const domainSet = new Set<string>();
  const addDomain = (value?: string | null) => {
    const normalized = normalizeDomainCandidate(value);
    if (normalized) {
      domainSet.add(normalized);
    }
  };

  provided?.forEach(addDomain);

  if (company?.domains?.length) {
    company.domains.forEach(addDomain);
  }

  addDomain(extractDomainFromEmail(company?.managerEmail));

  if (domainSet.size === 0) {
    addDomain(DEFAULT_ALLOWED_DOMAIN);
  }

  return Array.from(domainSet);
};

export const emailMatchesAllowedDomains = (
  email?: string | null,
  allowedDomains?: string[]
): boolean => {
  if (!email || !allowedDomains?.length) {
    return false;
  }

  const emailDomain = extractDomainFromEmail(email);
  if (!emailDomain) {
    return false;
  }

  return allowedDomains.some((domain) => {
    const normalizedDomain = normalizeDomainCandidate(domain);
    if (!normalizedDomain) {
      return false;
    }

    if (normalizedDomain.includes('.')) {
      return (
        emailDomain === normalizedDomain ||
        emailDomain.endsWith(`.${normalizedDomain}`)
      );
    }

    return (
      emailDomain === normalizedDomain ||
      emailDomain.startsWith(`${normalizedDomain}.`)
    );
  });
};






