"use client";

import Link from "next/link";
import config from "@/config";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const Footer = () => {
  const { t } = useTranslation();

  const footerLinks = {
    product: [
      { label: t("footer.products"), href: "/products" },
      { label: t("footer.scoreTransparency"), href: "/transparency" },
      { label: t("footer.methodology"), href: "/methodology" },
      { label: t("footer.api"), href: "/api-docs" },
    ],
    company: [
      { label: t("footer.about"), href: "/about" },
      { label: t("footer.blog"), href: "/blog" },
      { label: t("footer.pressKit"), href: "/press" },
      { label: t("footer.partners"), href: "/partners" },
    ],
    legal: [
      { label: t("footer.legalNotice"), href: "/legal" },
      { label: t("footer.privacyPolicy"), href: "/privacy-policy" },
      { label: t("footer.termsOfService"), href: "/tos" },
      { label: t("footer.cookiePolicy"), href: "/cookies" },
    ],
  };
